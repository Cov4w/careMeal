"""
체성분 계산 모듈
export2garmin의 Xiaomi_Scale_Body_Metrics.py 기반
"""

from math import floor
from dataclasses import dataclass
from typing import Optional


@dataclass
class BodyComposition:
    """체성분 분석 결과"""
    # 기본 측정값
    weight: float  # kg
    height: float  # cm
    age: int
    sex: str  # 'male' or 'female'
    impedance: float  # ohm
    impedance_low: Optional[float] = None  # ohm
    heart_rate: Optional[int] = None  # bpm

    # 계산된 값들
    bmi: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    water_percentage: Optional[float] = None
    bone_mass: Optional[float] = None  # kg
    muscle_mass: Optional[float] = None  # kg
    visceral_fat: Optional[float] = None
    bmr: Optional[float] = None  # kcal
    metabolic_age: Optional[int] = None
    protein_percentage: Optional[float] = None
    body_type: Optional[str] = None
    ideal_weight: Optional[float] = None  # kg
    fat_mass: Optional[float] = None  # kg
    fat_free_mass: Optional[float] = None  # kg
    body_score: Optional[int] = None


class BodyMetricsCalculator:
    """체성분 계산기"""

    BODY_TYPES = [
        'obese', 'overweight', 'thick-set',
        'lack-exercise', 'balanced', 'balanced-muscular',
        'skinny', 'balanced-skinny', 'skinny-muscular'
    ]

    def __init__(self, weight: float, height: float, age: int, sex: str, impedance: float):
        self.weight = weight
        self.height = height
        self.age = age
        self.sex = sex.lower()
        self.impedance = impedance

    def _check_value(self, value: float, minimum: float, maximum: float) -> float:
        """값 범위 제한"""
        return max(minimum, min(maximum, value))

    def _get_lbm_coefficient(self) -> float:
        """제지방량 계수 계산"""
        lbm = (self.height * 9.058 / 100) * (self.height / 100)
        lbm += self.weight * 0.32 + 12.226
        lbm -= self.impedance * 0.0068
        lbm -= self.age * 0.0542
        return lbm

    def get_bmi(self) -> float:
        """BMI 계산"""
        bmi = self.weight / ((self.height / 100) ** 2)
        return self._check_value(bmi, 10, 90)

    def get_fat_percentage(self) -> float:
        """체지방률 계산"""
        if self.sex == 'female' and self.age <= 49:
            const = 9.25
        elif self.sex == 'female' and self.age > 49:
            const = 7.25
        else:
            const = 0.8

        lbm = self._get_lbm_coefficient()

        if self.sex == 'male' and self.weight < 61:
            coefficient = 0.98
        elif self.sex == 'female' and self.weight > 60:
            coefficient = 0.96
            if self.height > 160:
                coefficient *= 1.03
        elif self.sex == 'female' and self.weight < 50:
            coefficient = 1.02
            if self.height > 160:
                coefficient *= 1.03
        else:
            coefficient = 1.0

        fat_percentage = (1.0 - (((lbm - const) * coefficient) / self.weight)) * 100

        if fat_percentage > 63:
            fat_percentage = 75

        return self._check_value(fat_percentage, 5, 75)

    def get_water_percentage(self) -> float:
        """수분 비율 계산"""
        water_percentage = (100 - self.get_fat_percentage()) * 0.7

        if water_percentage <= 50:
            coefficient = 1.02
        else:
            coefficient = 0.98

        if water_percentage * coefficient >= 65:
            water_percentage = 75

        return self._check_value(water_percentage * coefficient, 35, 75)

    def get_bone_mass(self) -> float:
        """골량 계산 (kg)"""
        if self.sex == 'female':
            base = 0.245691014
        else:
            base = 0.18016894

        bone_mass = (base - (self._get_lbm_coefficient() * 0.05158)) * -1

        if bone_mass > 2.2:
            bone_mass += 0.1
        else:
            bone_mass -= 0.1

        if self.sex == 'female' and bone_mass > 5.1:
            bone_mass = 8
        elif self.sex == 'male' and bone_mass > 5.2:
            bone_mass = 8

        return self._check_value(bone_mass, 0.5, 8)

    def get_muscle_mass(self) -> float:
        """근육량 계산 (kg)"""
        muscle_mass = self.weight - ((self.get_fat_percentage() * 0.01) * self.weight) - self.get_bone_mass()

        if self.sex == 'female' and muscle_mass >= 84:
            muscle_mass = 120
        elif self.sex == 'male' and muscle_mass >= 93.5:
            muscle_mass = 120

        return self._check_value(muscle_mass, 10, 120)

    def get_visceral_fat(self) -> float:
        """내장지방 등급 계산"""
        if self.sex == 'female':
            if self.weight > (13 - (self.height * 0.5)) * -1:
                subsubcalc = ((self.height * 1.45) + (self.height * 0.1158) * self.height) - 120
                subcalc = self.weight * 500 / subsubcalc
                vfal = (subcalc - 6) + (self.age * 0.07)
            else:
                subcalc = 0.691 + (self.height * -0.0024) + (self.height * -0.0024)
                vfal = (((self.height * 0.027) - (subcalc * self.weight)) * -1) + (self.age * 0.07) - self.age
        else:
            if self.height < self.weight * 1.6:
                subcalc = ((self.height * 0.4) - (self.height * (self.height * 0.0826))) * -1
                vfal = ((self.weight * 305) / (subcalc + 48)) - 2.9 + (self.age * 0.15)
            else:
                subcalc = 0.765 + self.height * -0.0015
                vfal = (((self.height * 0.143) - (self.weight * subcalc)) * -1) + (self.age * 0.15) - 5.0

        return self._check_value(vfal, 1, 50)

    def get_bmr(self) -> float:
        """기초대사량 계산 (kcal)"""
        if self.sex == 'female':
            bmr = 864.6 + self.weight * 10.2036
            bmr -= self.height * 0.39336
            bmr -= self.age * 6.204
        else:
            bmr = 877.8 + self.weight * 14.916
            bmr -= self.height * 0.726
            bmr -= self.age * 8.976

        if self.sex == 'female' and bmr > 2996:
            bmr = 5000
        elif self.sex == 'male' and bmr > 2322:
            bmr = 5000

        return self._check_value(bmr, 500, 10000)

    def get_metabolic_age(self) -> int:
        """대사 연령 계산"""
        if self.sex == 'female':
            age = (self.height * -1.1165) + (self.weight * 1.5784) + \
                  (self.age * 0.4615) + (self.impedance * 0.0415) + 83.2548
        else:
            age = (self.height * -0.7471) + (self.weight * 0.9161) + \
                  (self.age * 0.4184) + (self.impedance * 0.0517) + 54.2267

        return int(self._check_value(age, 15, 80))

    def get_protein_percentage(self) -> float:
        """단백질 비율 계산"""
        protein = (self.get_muscle_mass() / self.weight) * 100
        protein -= self.get_water_percentage()
        return self._check_value(protein, 5, 32)

    def get_body_type(self) -> str:
        """체형 분류"""
        fat_pct = self.get_fat_percentage()
        muscle = self.get_muscle_mass()

        # 체지방 기준 (나이별 기준값 사용 - 18-40세 기준)
        if self.sex == 'male':
            fat_scale = [11.0, 17.0, 22.0]
            muscle_scale = [49.4, 59.5] if self.height >= 170 else [44.0, 52.5]
        else:
            fat_scale = [21.0, 28.0, 35.0]
            muscle_scale = [36.5, 42.6] if self.height >= 160 else [32.9, 37.6]

        if fat_pct > fat_scale[2]:
            fat_factor = 0
        elif fat_pct < fat_scale[1]:
            fat_factor = 2
        else:
            fat_factor = 1

        if muscle > muscle_scale[1]:
            return self.BODY_TYPES[3 + (fat_factor * 3)]
        elif muscle < muscle_scale[0]:
            return self.BODY_TYPES[1 + (fat_factor * 3)]
        else:
            return self.BODY_TYPES[2 + (fat_factor * 3)]

    def get_ideal_weight(self) -> float:
        """이상 체중 계산 (kg)"""
        if self.sex == 'female':
            return (self.height - 70) * 0.6
        else:
            return (self.height - 80) * 0.7

    def get_body_score(self) -> int:
        """체형 점수 계산 (100점 만점)"""
        score = 100

        # BMI 감점
        bmi = self.get_bmi()
        if bmi < 18.5:
            score -= (18.5 - bmi) * 2
        elif bmi > 25:
            score -= (bmi - 25) * 2

        # 체지방률 감점
        fat = self.get_fat_percentage()
        ideal_fat = 15 if self.sex == 'male' else 23
        if fat > ideal_fat:
            score -= (fat - ideal_fat) * 1.5

        # 내장지방 감점
        visceral = self.get_visceral_fat()
        if visceral > 10:
            score -= (visceral - 10) * 2

        return int(self._check_value(score, 0, 100))

    def calculate_all(self) -> BodyComposition:
        """모든 체성분 계산"""
        fat_pct = self.get_fat_percentage()

        return BodyComposition(
            weight=self.weight,
            height=self.height,
            age=self.age,
            sex=self.sex,
            impedance=self.impedance,
            bmi=round(self.get_bmi(), 1),
            body_fat_percentage=round(fat_pct, 1),
            water_percentage=round(self.get_water_percentage(), 1),
            bone_mass=round(self.get_bone_mass(), 1),
            muscle_mass=round(self.get_muscle_mass(), 1),
            visceral_fat=round(self.get_visceral_fat(), 1),
            bmr=round(self.get_bmr()),
            metabolic_age=self.get_metabolic_age(),
            protein_percentage=round(self.get_protein_percentage(), 1),
            body_type=self.get_body_type(),
            ideal_weight=round(self.get_ideal_weight(), 1),
            fat_mass=round(self.weight * fat_pct / 100, 1),
            fat_free_mass=round(self.weight * (100 - fat_pct) / 100, 1),
            body_score=self.get_body_score()
        )


def print_body_composition(comp: BodyComposition):
    """체성분 분석 결과 출력"""
    print("\n" + "=" * 50)
    print("체성분 분석 결과")
    print("=" * 50)

    print(f"\n[기본 정보]")
    print(f"  체중: {comp.weight} kg")
    print(f"  신장: {comp.height} cm")
    print(f"  나이: {comp.age}세")
    print(f"  성별: {'남성' if comp.sex == 'male' else '여성'}")
    print(f"  임피던스: {comp.impedance} ohm")

    print(f"\n[체성분 분석]")
    print(f"  BMI: {comp.bmi}")
    print(f"  체지방률: {comp.body_fat_percentage}%")
    print(f"  체지방량: {comp.fat_mass} kg")
    print(f"  수분 비율: {comp.water_percentage}%")
    print(f"  골량: {comp.bone_mass} kg")
    print(f"  근육량: {comp.muscle_mass} kg")
    print(f"  제지방량: {comp.fat_free_mass} kg")
    print(f"  단백질 비율: {comp.protein_percentage}%")

    print(f"\n[건강 지표]")
    print(f"  내장지방 등급: {comp.visceral_fat}")
    print(f"  기초대사량: {comp.bmr} kcal")
    print(f"  대사 연령: {comp.metabolic_age}세")
    print(f"  체형: {comp.body_type}")
    print(f"  이상 체중: {comp.ideal_weight} kg")
    print(f"  체형 점수: {comp.body_score}점")

    # 체중 조절 목표
    weight_diff = comp.weight - comp.ideal_weight
    if weight_diff > 0:
        print(f"\n[체중 관리]")
        print(f"  감량 목표: {weight_diff:.1f} kg")

    print("=" * 50)


if __name__ == "__main__":
    # 테스트
    calc = BodyMetricsCalculator(
        weight=86.2,
        height=170,  # 사용자 키 입력 필요
        age=25,      # 사용자 나이 입력 필요
        sex='male',  # 사용자 성별 입력 필요
        impedance=439.0
    )

    result = calc.calculate_all()
    print_body_composition(result)
