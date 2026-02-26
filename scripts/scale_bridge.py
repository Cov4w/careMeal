#!/usr/bin/env python3
"""
CareMeal 체중계 브릿지 서비스
샤오미 S400 체중계 데이터를 수신하여 CareMeal API로 전송

사용법:
  python scripts/scale_bridge.py

필요한 패키지:
  pip install bleak cryptography requests
"""

import asyncio
import requests
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESCCM
from bleak import BleakScanner
import struct
import json
import os

# ============================================================
# 설정 (환경변수 또는 기본값)
# ============================================================
BLE_KEY = os.getenv("SCALE_BLE_KEY", "fb00b65890c3e1292775cebf1b31b716")
MAC_ADDRESS = os.getenv("SCALE_MAC", "CC:DA:20:EB:CC:9B")
API_BASE_URL = os.getenv("CAREMEAL_API_URL", "http://localhost:8000")
ACCESS_TOKEN = os.getenv("CAREMEAL_ACCESS_TOKEN", "")  # 로그인 후 토큰

# 로그인 정보 (환경변수 또는 입력)
USERNAME = os.getenv("CAREMEAL_USERNAME", "")
PASSWORD = os.getenv("CAREMEAL_PASSWORD", "")

# ============================================================
# 데이터 클래스
# ============================================================
@dataclass
class ScaleData:
    """체중계 측정 데이터"""
    weight: Optional[float] = None
    impedance: Optional[float] = None
    heart_rate: Optional[int] = None
    timestamp: Optional[str] = None

    def is_complete(self) -> bool:
        return self.weight is not None and self.impedance is not None

    def __str__(self):
        parts = []
        if self.weight:
            parts.append(f"체중: {self.weight:.1f}kg")
        if self.impedance:
            parts.append(f"임피던스: {self.impedance:.0f}Ω")
        if self.heart_rate:
            parts.append(f"심박수: {self.heart_rate}bpm")
        return " | ".join(parts) if parts else "대기 중..."


# ============================================================
# 복호화 함수
# ============================================================
def decrypt_mibeacon_v5(data: bytes, key: bytes, mac: bytes) -> Optional[bytes]:
    """MiBeacon v5 복호화"""
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
        associated_data = b"\x11"
        decrypted = cipher.decrypt(nonce, encrypted_payload + mic, associated_data)
        return decrypted
    except Exception:
        return None


def parse_s400_object(data: bytes) -> dict:
    """S400 Object 파싱"""
    result = {}
    offset = 0

    while offset + 3 <= len(data):
        obj_id = int.from_bytes(data[offset:offset+2], 'little')
        obj_len = data[offset+2]

        if offset + 3 + obj_len > len(data):
            break

        obj_data = data[offset+3:offset+3+obj_len]
        offset += 3 + obj_len

        # S400 Body Composition Scale (Object ID: 0x6e16)
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
                else:
                    result['impedance_low'] = impedance / 10

    return result


# ============================================================
# API 연동
# ============================================================
def login() -> Optional[str]:
    """CareMeal API 로그인하여 토큰 획득"""
    global ACCESS_TOKEN, USERNAME, PASSWORD

    if ACCESS_TOKEN:
        return ACCESS_TOKEN

    # 환경변수에 없으면 입력 받기
    if not USERNAME:
        USERNAME = input("📧 CareMeal 아이디(이메일): ").strip()
    if not PASSWORD:
        import getpass
        PASSWORD = getpass.getpass("🔑 비밀번호: ")

    url = f"{API_BASE_URL}/login"
    try:
        response = requests.post(url, json={
            "user_id": USERNAME,
            "password": PASSWORD
        }, timeout=10)

        if response.status_code == 200:
            result = response.json()
            ACCESS_TOKEN = result.get("access_token", "")
            if ACCESS_TOKEN:
                print(f"✅ 로그인 성공! ({result.get('name', USERNAME)})")
                return ACCESS_TOKEN
            else:
                print("❌ 토큰을 받지 못했습니다.")
                return None
        else:
            print(f"❌ 로그인 실패: {response.json().get('detail', response.text)}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"❌ API 서버 연결 실패: {API_BASE_URL}")
        return None
    except Exception as e:
        print(f"❌ 로그인 오류: {e}")
        return None


def save_to_api(data: ScaleData) -> bool:
    """CareMeal API로 데이터 전송"""
    url = f"{API_BASE_URL}/api/body-composition"

    headers = {
        "Content-Type": "application/json",
    }
    if ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {ACCESS_TOKEN}"

    payload = {
        "weight": data.weight,
        "impedance": int(data.impedance),
    }
    if data.heart_rate:
        payload["heart_rate"] = data.heart_rate

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            result = response.json()
            print("\n" + "=" * 60)
            print("✅ API 저장 성공!")
            print(f"   체중: {result.get('weight', 'N/A')} kg")
            print(f"   BMI: {result.get('bmi', 'N/A')}")
            print(f"   체지방률: {result.get('body_fat_percentage', 'N/A')}%")
            print(f"   근육량: {result.get('muscle_mass', 'N/A')} kg")
            print(f"   체형점수: {result.get('body_score', 'N/A')}")
            print("=" * 60)
            return True
        else:
            print(f"\n❌ API 오류: {response.status_code}")
            print(f"   응답: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"\n❌ API 서버 연결 실패: {API_BASE_URL}")
        print("   서버가 실행 중인지 확인하세요.")
        return False
    except Exception as e:
        print(f"\n❌ API 전송 실패: {e}")
        return False


# ============================================================
# BLE 스캐너
# ============================================================
class ScaleBridge:
    def __init__(self):
        self.ble_key = bytes.fromhex(BLE_KEY)
        self.mac_bytes = bytes.fromhex(MAC_ADDRESS.replace(":", ""))
        self.scale_data = ScaleData()
        self.last_raw = None
        self.measurement_complete = False
        self.saved = False

    def detection_callback(self, device, advertisement_data):
        """BLE 광고 수신 콜백"""
        if self.measurement_complete and self.saved:
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

            # 짧은 데이터 = 대기 상태
            if len(data) < 13:
                print(".", end="", flush=True)
                continue

            # 복호화
            decrypted = decrypt_mibeacon_v5(data, self.ble_key, self.mac_bytes)

            if decrypted:
                parsed = parse_s400_object(decrypted)

                if parsed:
                    if 'weight' in parsed:
                        self.scale_data.weight = parsed['weight']
                    if 'impedance' in parsed:
                        self.scale_data.impedance = parsed['impedance']
                    if 'heart_rate' in parsed:
                        self.scale_data.heart_rate = parsed['heart_rate']

                    self.scale_data.timestamp = datetime.now().isoformat()

                    print(f"\n📊 {self.scale_data}")

                    if self.scale_data.is_complete() and not self.measurement_complete:
                        self.measurement_complete = True
                        print("\n" + "=" * 60)
                        print("✅ 측정 완료!")
                        print(f"   {self.scale_data}")
                        print("=" * 60)

                        # API로 전송
                        self.saved = save_to_api(self.scale_data)

    async def run(self, duration: int = 120):
        """스캐너 실행"""
        print("=" * 60)
        print("🏋️  CareMeal 체중계 브릿지")
        print("=" * 60)
        print(f"\n📡 BLE KEY: {BLE_KEY[:8]}...{BLE_KEY[-8:]}")
        print(f"📱 MAC: {MAC_ADDRESS}")
        print(f"🌐 API: {API_BASE_URL}")

        # 로그인 확인
        print("\n" + "-" * 60)
        if not ACCESS_TOKEN:
            print("🔐 CareMeal 로그인이 필요합니다.\n")
            token = login()
            if not token:
                print("\n❌ 로그인 실패. 종료합니다.")
                return
        else:
            print(f"🔐 Token: 설정됨")

        print("-" * 60)
        print("📋 사용 방법:")
        print("   1. Mi Home 앱 완전 종료")
        print("   2. 체중계 위에 올라가서 측정")
        print("   3. 심박수까지 측정 완료 대기")
        print("-" * 60)
        print(f"\n⏳ 스캔 중... ({duration}초 대기, Ctrl+C로 종료)\n")

        scanner = BleakScanner(detection_callback=self.detection_callback)
        await scanner.start()

        try:
            elapsed = 0
            while elapsed < duration:
                await asyncio.sleep(1)
                elapsed += 1

                if self.measurement_complete and self.saved:
                    print("\n✅ 측정 및 저장 완료! 5초 후 종료...")
                    await asyncio.sleep(5)
                    break
        except asyncio.CancelledError:
            pass
        finally:
            await scanner.stop()

        print("\n" + "=" * 60)
        if self.saved:
            print("✅ 완료! 앱에서 체성분 데이터를 확인하세요.")
        elif self.measurement_complete:
            print("⚠️ 측정은 완료했지만 API 저장에 실패했습니다.")
            print(f"   데이터: {self.scale_data}")
        else:
            print("❌ 측정 데이터를 수신하지 못했습니다.")
        print("=" * 60)


# ============================================================
# 메인
# ============================================================
async def main():
    bridge = ScaleBridge()
    await bridge.run(duration=180)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 종료")
