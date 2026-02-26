#!/usr/bin/env python3
"""
CareMeal 체중계 브릿지 서비스 (웹 연동용)
웹에서 호출되어 백그라운드로 실행됨

사용법:
  python scripts/scale_bridge_service.py --session-id=xxx --user-id=123 --token=xxx
"""

import asyncio
import argparse
import json
import os
import sys
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional
from pathlib import Path

# 상태 파일 경로
STATUS_DIR = Path(__file__).parent.parent / "temp" / "scale_sessions"
STATUS_DIR.mkdir(parents=True, exist_ok=True)

# BLE 관련 import (bleak이 없으면 시뮬레이션 모드)
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESCCM
    from bleak import BleakScanner
    import struct
    BLE_AVAILABLE = True
except ImportError:
    BLE_AVAILABLE = False
    print("Warning: bleak/cryptography not installed, running in simulation mode")

# ============================================================
# 설정
# ============================================================
BLE_KEY = os.getenv("SCALE_BLE_KEY", "fb00b65890c3e1292775cebf1b31b716")
MAC_ADDRESS = os.getenv("SCALE_MAC", "CC:DA:20:EB:CC:9B")

# ============================================================
# 상태 관리
# ============================================================
@dataclass
class SessionStatus:
    session_id: str
    status: str  # idle, scanning, measuring, complete, error
    message: str
    remaining_seconds: int
    weight: Optional[float] = None
    impedance: Optional[float] = None
    heart_rate: Optional[int] = None
    bmi: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    muscle_mass: Optional[float] = None
    body_score: Optional[int] = None
    error: Optional[str] = None
    timestamp: Optional[str] = None

    def save(self):
        """상태를 파일에 저장"""
        filepath = STATUS_DIR / f"{self.session_id}.json"
        with open(filepath, 'w') as f:
            json.dump(asdict(self), f, ensure_ascii=False)

    @classmethod
    def load(cls, session_id: str) -> Optional['SessionStatus']:
        """파일에서 상태 로드"""
        filepath = STATUS_DIR / f"{session_id}.json"
        if filepath.exists():
            with open(filepath, 'r') as f:
                data = json.load(f)
                return cls(**data)
        return None


# ============================================================
# 복호화 함수
# ============================================================
def decrypt_mibeacon_v5(data: bytes, key: bytes, mac: bytes) -> Optional[bytes]:
    """MiBeacon v5 복호화"""
    if not BLE_AVAILABLE:
        return None
    if len(data) < 13:
        return None

    frame_ctrl = int.from_bytes(data[0:2], 'little')
    is_encrypted = bool(frame_ctrl & 0x0008)

    if not is_encrypted:
        return data[5:]

    has_mac = bool(frame_ctrl & 0x0010)
    has_capability = bool(frame_ctrl & 0x0020)

    i = 5
    if has_mac:
        i += 6
    if has_capability:
        i += 1

    encrypted_payload = data[i:-7]
    nonce_suffix = data[-7:-4]
    mic = data[-4:]

    if len(encrypted_payload) == 0:
        return None

    nonce = mac[::-1] + data[2:5] + nonce_suffix

    try:
        cipher = AESCCM(key, tag_length=4)
        decrypted = cipher.decrypt(nonce, encrypted_payload + mic, b"\x11")
        return decrypted
    except Exception:
        return None


def parse_s400_object(data: bytes) -> dict:
    """S400 Object 파싱"""
    if not BLE_AVAILABLE:
        return {}

    result = {}
    offset = 0

    while offset + 3 <= len(data):
        obj_id = int.from_bytes(data[offset:offset+2], 'little')
        obj_len = data[offset+2]

        if offset + 3 + obj_len > len(data):
            break

        obj_data = data[offset+3:offset+3+obj_len]
        offset += 3 + obj_len

        if obj_id == 0x6e16 and len(obj_data) == 9:
            profile_id, packed_data, timestamp = struct.unpack("<BII", obj_data)

            mass = packed_data & 0x7FF
            heart_rate_raw = (packed_data >> 11) & 0x7F
            impedance = packed_data >> 18

            if mass != 0:
                result['weight'] = mass / 10
            if 0 < heart_rate_raw < 127:
                result['heart_rate'] = heart_rate_raw + 50
            if impedance != 0:
                if mass != 0:
                    result['impedance'] = impedance / 10

    return result


# ============================================================
# API 연동
# ============================================================
def save_to_api(status: SessionStatus, api_url: str, token: str) -> bool:
    """CareMeal API로 데이터 전송"""
    import requests

    url = f"{api_url}/api/body-composition"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    payload = {
        "weight": status.weight,
        "impedance": int(status.impedance) if status.impedance else 500,
    }
    if status.heart_rate:
        payload["heart_rate"] = status.heart_rate

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            result = response.json()
            status.bmi = result.get('bmi')
            status.body_fat_percentage = result.get('body_fat_percentage')
            status.muscle_mass = result.get('muscle_mass')
            status.body_score = result.get('body_score')
            return True
        else:
            status.error = f"API 오류: {response.status_code}"
            return False
    except Exception as e:
        status.error = str(e)
        return False


# ============================================================
# BLE 스캐너
# ============================================================
class ScaleBridgeService:
    def __init__(self, session_id: str, user_id: str, token: str, api_url: str):
        self.session_id = session_id
        self.user_id = user_id
        self.token = token
        self.api_url = api_url
        self.ble_key = bytes.fromhex(BLE_KEY)
        self.mac_bytes = bytes.fromhex(MAC_ADDRESS.replace(":", ""))
        self.last_raw = None
        self.measurement_complete = False

        self.status = SessionStatus(
            session_id=session_id,
            status="scanning",
            message="체중계 검색 중...",
            remaining_seconds=60
        )

    def update_status(self, status: str, message: str, remaining: int = None):
        """상태 업데이트 및 저장"""
        self.status.status = status
        self.status.message = message
        if remaining is not None:
            self.status.remaining_seconds = remaining
        self.status.timestamp = datetime.now().isoformat()
        self.status.save()

    def detection_callback(self, device, advertisement_data):
        """BLE 광고 수신 콜백"""
        if self.measurement_complete:
            return

        name = device.name or ""
        if not any(n in name for n in ["Mijia", "S400", "Scale", "MIBCS"]):
            return

        if not advertisement_data.service_data:
            return

        for uuid, data in advertisement_data.service_data.items():
            if "fe95" not in str(uuid).lower():
                continue

            if data == self.last_raw:
                return
            self.last_raw = data

            if len(data) < 13:
                continue

            decrypted = decrypt_mibeacon_v5(data, self.ble_key, self.mac_bytes)

            if decrypted:
                parsed = parse_s400_object(decrypted)

                if parsed:
                    if 'weight' in parsed:
                        self.status.weight = parsed['weight']
                        self.update_status("measuring", f"체중: {parsed['weight']:.1f}kg 측정 중...")
                    if 'impedance' in parsed:
                        self.status.impedance = parsed['impedance']
                    if 'heart_rate' in parsed:
                        self.status.heart_rate = parsed['heart_rate']

                    # 체중 + 임피던스 모두 있으면 완료
                    if self.status.weight and self.status.impedance and not self.measurement_complete:
                        self.measurement_complete = True
                        self.update_status("saving", "API에 저장 중...")

                        # API 저장
                        if save_to_api(self.status, self.api_url, self.token):
                            self.update_status("complete", "측정 완료!")
                        else:
                            self.update_status("error", self.status.error or "저장 실패")

    async def run(self, duration: int = 60):
        """스캐너 실행"""
        self.update_status("scanning", "체중계를 찾는 중...", duration)

        if not BLE_AVAILABLE:
            # 시뮬레이션 모드 (테스트용)
            self.update_status("error", "BLE 라이브러리가 설치되지 않았습니다.")
            return

        scanner = BleakScanner(detection_callback=self.detection_callback)

        try:
            await scanner.start()
            self.update_status("scanning", "체중계에 올라가세요", duration)

            for remaining in range(duration, 0, -1):
                if self.measurement_complete:
                    break

                self.status.remaining_seconds = remaining
                if self.status.status == "scanning":
                    self.status.message = "체중계에 올라가세요"
                self.status.save()

                await asyncio.sleep(1)

            if not self.measurement_complete:
                self.update_status("error", "시간 초과. 다시 시도해주세요.", 0)

        except Exception as e:
            self.update_status("error", str(e), 0)
        finally:
            await scanner.stop()


# ============================================================
# 메인
# ============================================================
async def main():
    parser = argparse.ArgumentParser(description='CareMeal Scale Bridge Service')
    parser.add_argument('--session-id', required=True, help='Session ID')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--token', required=True, help='Access Token')
    parser.add_argument('--api-url', default='http://localhost:8000', help='API URL')
    parser.add_argument('--duration', type=int, default=60, help='Scan duration in seconds')

    args = parser.parse_args()

    bridge = ScaleBridgeService(
        session_id=args.session_id,
        user_id=args.user_id,
        token=args.token,
        api_url=args.api_url
    )

    await bridge.run(duration=args.duration)


if __name__ == "__main__":
    asyncio.run(main())
