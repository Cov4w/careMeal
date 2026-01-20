
import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardCheck, CheckCircle2, ChevronRight, ChevronLeft,
  Activity, ShieldCheck, Sparkles, User,
  Stethoscope, Thermometer, Droplets
} from 'lucide-react';

export interface DiagnosisResult {
  name: string;
  gender: string;
  age: string;
  height: string;
  weight: string;
  conditions: string[];
  interests: string[];
  bmi: number;
  weightStatus: string;
  habitScore: number;
  prescriptions: string[];
  summary: any;
  diseaseDetails?: any;
  lifestyle?: {
    caffeine: string;
    alcohol: string;
    smoking: string;
  };
  healthGoals?: string[];
  userId?: string;
}

interface DiagnosisProps {
  onComplete: (result: DiagnosisResult) => void;
  onNavigate: (tab: any) => void;
  selectedConditions: string[];
  onConditionsChange: (conditions: string[]) => void;
  initialName?: string;
  onBack?: () => void;
}

const Diagnosis: React.FC<DiagnosisProps> = ({
  onComplete,
  onNavigate,
  selectedConditions,
  onConditionsChange,
  initialName = '',
  onBack
}) => {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 총 7단계 (1:기본, 2:생활습관, 3:질환선택, 4:질환상세, 5:건강수치, 6:식습관/목표, 7:동의)
  const totalSteps = 7;

  const [formData, setFormData] = useState({
    name: initialName,
    gender: '남성',
    age: '55',
    height: '170',
    weight: '70',
    interests: [] as string[],
    // 질환별 정밀 정보
    diseaseDetails: {
      diabetes: {
        type: [] as string[], // 당뇨 유형 (전단계, 2형, 1형, 임신성)
        hbA1c: '',
        bloodSugar: '',
        treatment: [] as string[], // 생활습관, 경구약, 인슐린, 펌프
        hypoRisk: '', // 저혈당 유발 약물 사용 여부 (기본값 없음)
        hypoSymptoms: '', // 저혈당 증상 경험 (기본값 없음)
        goals: [] as string[], // 개선 습관
        weakTimes: [] as string[], // 관리 안되는 시간
        exerciseTiming: '운동 안 함' // 운동 시간
      },
      hypertension: {
        meds: [] as string[], // 약물 종류 (ACEI/ARB, CCB, 이뇨제, 베타차단제 등)
        medsUnknown: false
      },
      kidney: {
        conditions: [] as string[] // 만성콩팥병, 고지혈증, 통풍, 심부전 등
      },
      etc: ''
    },
    // 건강 수치
    healthMetrics: {
      bloodSugar: '',
      bloodPressure: '',
      cholesterol: '',
    },
    // 생활 습관 (Step 1에서 수집)
    lifestyle: {
      caffeine: '',
      alcohol: '',
      alcoholFreq: '',
      smoking: ''
    },
    healthGoals: [] as string[],
    eatingHabits: {
      veggieFrequency: '',
      sugarIntake: '',
      meatType: '',
      saltLevel: '',
    },
    activity: '', // Activity is now part of basic info
    consentHealth: false,
    consentAI: false
  });

  useEffect(() => {
    if (initialName) {
      setFormData(prev => ({ ...prev, name: initialName }));
    }
  }, [initialName]);

  const bmi = useMemo(() => {
    const h = parseFloat(formData.height) / 100;
    const w = parseFloat(formData.weight);
    if (!h || !w) return 0;
    return parseFloat((w / (h * h)).toFixed(1));
  }, [formData.height, formData.weight]);

  const weightStatus = useMemo(() => {
    if (bmi === 0) return "-";
    if (bmi >= 25) return "비만";
    if (bmi >= 23) return "과체중";
    if (bmi < 18.5) return "저체중";
    return "정상";
  }, [bmi]);

  const toggleCondition = (id: string) => {
    const newConditions = selectedConditions.includes(id)
      ? selectedConditions.filter(c => c !== id)
      : [...selectedConditions, id];
    onConditionsChange(newConditions);
  };


  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.age || !formData.height || !formData.weight)) return alert("모든 기본 정보를 입력해주세요.");
    // Step 2 validation (lifestyle)
    if (step === 2 && (!formData.lifestyle.caffeine || !formData.lifestyle.alcohol || !formData.lifestyle.smoking || !formData.activity)) {
      return alert("모든 생활 습관 항목을 선택해주세요.");
    }

    if (step === 3 && selectedConditions.length === 0) return alert("최소 하나 이상의 질환 또는 '일반건강'을 선택해주세요.");

    // 심화 질문 단계(3->4) 건너뛰기 로직
    if (step === 3 && (selectedConditions.includes('일반건강') && selectedConditions.length === 1)) {
      setStep(5); // 4(질환상세) 건너뛰고 5(건강수치)로
      return;
    }

    if (step === 6 && (!formData.eatingHabits.veggieFrequency || !formData.eatingHabits.sugarIntake || !formData.eatingHabits.meatType || !formData.eatingHabits.saltLevel)) {
      return alert("식습관 정보를 모두 입력해주세요.");
    }

    if (step === 7 && (!formData.consentHealth || !formData.consentAI)) return alert("필수 동의 항목에 체크해주세요.");

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      startAnalysis();
    }
  };

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result: DiagnosisResult = {
        name: formData.name,
        gender: formData.gender,
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        conditions: selectedConditions,
        interests: formData.interests,
        bmi,
        weightStatus,
        habitScore: 92,
        prescriptions: ["맞춤형 영양 분석 결과가 도출되었습니다."],
        summary: formData,
        diseaseDetails: formData.diseaseDetails,
        lifestyle: formData.lifestyle,
        healthGoals: formData.healthGoals
      };
      setIsAnalyzing(false);
      onComplete(result);
    }, 2500);
  };

  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-10 text-center animate-fadeIn">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <Sparkles size={32} className="animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">정밀 분석 중</h2>
        <p className="text-sm text-gray-400 leading-relaxed">AI 김닥터가 입력하신 정보를 바탕으로<br />{formData.name}님만을 위한 영양 리포트를 생성합니다.</p>
        <div className="mt-12 w-full max-w-xs h-2 bg-gray-50 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-progressBar" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] pb-24 overflow-y-auto no-scrollbar">
      <header className="px-5 pb-5 pt-[calc(env(safe-area-inset-top,12px)+12px)] bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-primary">
            <ClipboardCheck size={24} />
            <h1 className="text-xl font-bold text-gray-900">영양 정밀 진단</h1>
          </div>
          <span className="text-xs font-bold text-gray-300">{step} / {totalSteps}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </header>

      <div className="p-5 flex-1 flex flex-col">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-900">1️⃣ 기본 인적 사항</h2>
            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 space-y-5">
              <Input label="이름" value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} placeholder="성함을 입력해주세요" icon={<User size={16} />} />

              <div className="grid grid-cols-2 gap-4">
                <ScrollPicker
                  label="성별"
                  value={formData.gender}
                  options={['남성', '여성']}
                  onChange={(v: string) => setFormData({ ...formData, gender: v })}
                />
                <ScrollPicker
                  label="만 나이"
                  value={formData.age}
                  options={Array.from({ length: 91 }, (_, i) => (i + 10).toString())}
                  onChange={(v: string) => setFormData({ ...formData, age: v })}
                  unit="세"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ScrollPicker
                  label="키"
                  value={formData.height}
                  options={Array.from({ length: 101 }, (_, i) => (i + 100).toString())}
                  onChange={(v: string) => setFormData({ ...formData, height: v })}
                  unit="cm"
                />
                <ScrollPicker
                  label="몸무게"
                  value={formData.weight}
                  options={Array.from({ length: 151 }, (_, i) => (i + 30).toString())}
                  onChange={(v: string) => setFormData({ ...formData, weight: v })}
                  unit="kg"
                />
              </div>
            </div>

          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-900">2️⃣ 생활 습관</h2>
            <p className="text-xs text-gray-400 -mt-4">평소 생활 습관을 솔직하게 알려주세요.</p>

            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 space-y-6">
              <HabitSelect
                label="☕ 평소 카페인(커피) 섭취량"
                options={[
                  '거의 안 마심 (주 1회 미만)',
                  '적당히 (하루 1~2잔)',
                  '많이 (하루 3잔 이상)',
                  '카페인 민감 (두근거림 등)',
                  '믹스/단 커피 주로 섭취'
                ]}
                value={formData.lifestyle.caffeine}
                onChange={(v: string) => setFormData({ ...formData, lifestyle: { ...formData.lifestyle, caffeine: v } })}
                enlarged
              />

              <div className="grid grid-cols-1 gap-5">
                <HabitSelect
                  label="🍺 음주 횟수 (일주일 기준)"
                  options={['전혀 안 마심', '가끔 (주 1~2회)', '자주 (주 3~4회)', '매일 마심']}
                  value={formData.lifestyle.alcohol}
                  onChange={(v: string) => setFormData({ ...formData, lifestyle: { ...formData.lifestyle, alcohol: v } })}
                  enlarged
                />
                <HabitSelect
                  label="🚬 흡연 여부"
                  options={['비흡연', '과거 흡연 (현재 금연)', '현재 흡연 중']}
                  value={formData.lifestyle.smoking}
                  onChange={(v: string) => setFormData({ ...formData, lifestyle: { ...formData.lifestyle, smoking: v } })}
                  enlarged
                />
                <HabitSelect
                  label="🏃 활동량"
                  options={['아주 적음', '보통', '활동적', '매우 활동적']}
                  value={formData.activity}
                  onChange={(v: string) => setFormData({ ...formData, activity: v })}
                  enlarged
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-900">3️⃣ 주요 질환 관리</h2>
            <p className="text-xs text-gray-400 -mt-4">현재 관리 중인 질환을 선택해주세요. (중복 가능)</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: '고혈압', icon: <Activity size={18} /> },
                { id: '당뇨병', icon: <Droplets size={18} /> },
                { id: '신부전', icon: <Stethoscope size={18} /> },
                { id: '대사증후군', icon: <Thermometer size={18} /> }, // 고지혈증, 비만 통합
                { id: '기타', icon: <User size={18} /> },
                { id: '일반건강', icon: <ShieldCheck size={18} /> }
              ].map(item => (
                <button key={item.id} onClick={() => toggleCondition(item.id)} className={`flex items-center p-4 rounded-2xl border-2 transition-all ${selectedConditions.includes(item.id) ? 'border-primary bg-primary/5' : 'border-white bg-white shadow-sm'}`}>
                  <div className={`p-2 rounded-lg mr-3 ${selectedConditions.includes(item.id) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                    {item.icon}
                  </div>
                  <span className={`font-bold ${selectedConditions.includes(item.id) ? 'text-primary' : 'text-gray-700'}`}>{item.id}</span>
                  {selectedConditions.includes(item.id) && <CheckCircle2 size={20} className="ml-auto text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-900">4️⃣ 질환별 정밀 정보</h2>
            <p className="text-xs text-gray-400 -mt-4">선택하신 질환의 상세 관리 상태를 알려주세요.</p>

            <div className="space-y-6">
              {/* 고혈압 상세 */}
              {selectedConditions.includes('고혈압') && (
                <div className="bg-white p-6 rounded-[28px] border border-rose-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-rose-600 font-bold mb-2">
                    <Activity size={18} /> <span>고혈압 정밀 정보</span>
                  </div>
                  <div className="space-y-3">
                    <MultiSelect
                      label="💊 현재 복용 중인 혈압약 (중복 선택)"
                      options={['ACE억제제/ARB', '칼슘채널차단제(CCB)', '이뇨제', '베타차단제', '복합제', '약물 복용 안함']}
                      values={formData.diseaseDetails.hypertension.meds}
                      onChange={(v: string[]) => setFormData({
                        ...formData,
                        diseaseDetails: {
                          ...formData.diseaseDetails,
                          hypertension: { ...formData.diseaseDetails.hypertension, meds: v }
                        }
                      })}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="medsUnknown"
                        checked={formData.diseaseDetails.hypertension.medsUnknown}
                        onChange={(e) => setFormData({
                          ...formData,
                          diseaseDetails: {
                            ...formData.diseaseDetails,
                            hypertension: { ...formData.diseaseDetails.hypertension, medsUnknown: e.target.checked }
                          }
                        })}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <label htmlFor="medsUnknown" className="text-sm text-gray-500 font-medium">약 종류를 잘 모름</label>
                    </div>
                  </div>
                </div>
              )}

              {/* 당뇨병 상세 */}
              {selectedConditions.includes('당뇨병') && (
                <div className="bg-white p-6 rounded-[28px] border border-blue-100 shadow-sm space-y-6">
                  <div className="flex items-center space-x-2 text-blue-600 font-bold mb-2">
                    <Droplets size={18} /> <span>당뇨병 정밀 정보</span>
                  </div>

                  <MultiSelect
                    label="📋 진단 상태 (중복 선택)"
                    options={['당뇨 전단계', '제2형 당뇨병(성인)', '제1형 당뇨병(소아)', '임신성 당뇨병']}
                    values={formData.diseaseDetails.diabetes.type}
                    onChange={(v: string[]) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, type: v } } })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="당화혈색소 (%)" value={formData.diseaseDetails.diabetes.hbA1c} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, hbA1c: v } } })} type="number" placeholder="예: 6.5" />
                    <Input label="평균 공복 혈당 (mg/dL)" value={formData.diseaseDetails.diabetes.bloodSugar} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, bloodSugar: v } } })} type="number" placeholder="예: 110" />
                  </div>

                  <MultiSelect
                    label="💉 치료 방식 (중복 선택)"
                    options={['생활습관 관리', '경구약 복용', '인슐린 주사', '인슐린 펌프']}
                    values={formData.diseaseDetails.diabetes.treatment}
                    onChange={(v: string[]) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, treatment: v } } })}
                  />

                  <HabitSelect
                    label="⚠️ 저혈당 유발 약물/인슐린 사용 여부"
                    options={['예', '아니오', '잘 모름']}
                    value={formData.diseaseDetails.diabetes.hypoRisk}
                    onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, hypoRisk: v } } })}
                  />

                  <HabitSelect
                    label="😵 평소 저혈당 증상 경험"
                    options={['자주 있음', '가끔 있음', '없음']}
                    value={formData.diseaseDetails.diabetes.hypoSymptoms}
                    onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, hypoSymptoms: v } } })}
                  />

                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-bold ml-1">🕒 관리가 가장 안 되는 시간</p>
                    <div className="flex flex-wrap gap-2">
                      {['아침 공복', '점심 식후', '저녁 식후', '잠들기 전'].map((time) => (
                        <button
                          key={time}
                          onClick={() => {
                            const current = formData.diseaseDetails.diabetes.weakTimes;
                            const next = current.includes(time) ? current.filter((t: string) => t !== time) : [...current, time];
                            setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, weakTimes: next } } })
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${formData.diseaseDetails.diabetes.weakTimes.includes(time) ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 신부전 상세 */}
              {selectedConditions.includes('신부전') && (
                <div className="bg-white p-6 rounded-[28px] border border-purple-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-purple-600 font-bold mb-2">
                    <Stethoscope size={18} /> <span>신부전 상세 정보</span>
                  </div>
                  <MultiSelect
                    label="상세 질환 선택 (중복 가능)"
                    options={['만성 콩팥병(신장질환)', '이상지질혈증(고지혈증)', '고요산혈증/통풍', '심부전/심혈관질환']}
                    values={formData.diseaseDetails.kidney.conditions}
                    onChange={(v: string[]) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, kidney: { ...formData.diseaseDetails.kidney, conditions: v } } })}
                  />
                  <p className="text-[10px] text-gray-400">* 선택하신 질환에 따라 나트륨, 단백질, 칼륨 제한 식이 가이드가 적용됩니다.</p>
                </div>
              )}

              {(!selectedConditions.some(c => ['당뇨병', '고혈압', '신부전'].includes(c))) && (
                <div className="bg-gray-50 p-10 rounded-[28px] text-center border-2 border-dashed border-gray-200">
                  <p className="text-sm text-gray-400 font-bold">선택하신 질환에 대한 추가 문진이 필요 없습니다.<br />다음 단계로 이동해주세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-black text-gray-900">5️⃣ 건강 지표 기록</h2>
            <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-5">
              <Input label="공복 혈당 (mg/dL)" value={formData.healthMetrics.bloodSugar} onChange={(v: string) => setFormData({ ...formData, healthMetrics: { ...formData.healthMetrics, bloodSugar: v } })} type="number" placeholder="95" />
              <Input label="수축기 혈압 (mmHg)" value={formData.healthMetrics.bloodPressure} onChange={(v: string) => setFormData({ ...formData, healthMetrics: { ...formData.healthMetrics, bloodPressure: v } })} type="number" placeholder="120" />
              <Input label="총 콜레스테롤 (mg/dL)" value={formData.healthMetrics.cholesterol} onChange={(v: string) => setFormData({ ...formData, healthMetrics: { ...formData.healthMetrics, cholesterol: v } })} type="number" placeholder="190" />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-black text-gray-900">6️⃣ 정밀 식습관 분석</h2>
            <div className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm space-y-7">
              <HabitSelect label="식이섬유: 채소 섭취 빈도" options={['매 끼니', '하루 1회', '주 3-4회', '거의 안 함']} value={formData.eatingHabits.veggieFrequency} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, veggieFrequency: v } })} enlarged />
              <HabitSelect label="당류: 단 음료/디저트 섭취" options={['거의 안 함', '주 1-2회', '매일 1회', '매일 2회 이상']} value={formData.eatingHabits.sugarIntake} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, sugarIntake: v } })} enlarged />
              <HabitSelect label="지방: 주로 섭취하는 육류" options={['살코기/생선', '적당한 지방', '기름진 부위', '가공육(햄 등)']} value={formData.eatingHabits.meatType} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, meatType: v } })} enlarged />
              <HabitSelect label="나트륨: 음식의 간 정도" options={['싱겁게', '보통', '짜게', '매우 짜게']} value={formData.eatingHabits.saltLevel} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, saltLevel: v } })} enlarged />

              <div className="pt-4 border-t border-gray-100">
                <MultiSelect
                  label="🎯 가장 개선하고 싶은 건강 목표 (중복 선택)"
                  options={['단 음식/음료 줄이기', '야식 습관 고치기', '과식/폭식 조절', '규칙적인 식사하기', '체중 감량']}
                  values={formData.healthGoals}
                  onChange={(v: string[]) => setFormData({ ...formData, healthGoals: v })}
                />
              </div>
            </div>
          </div>
        )}



        {step === 7 && (
          <div className="space-y-8 animate-fadeIn py-10 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900">분석 준비 완료!</h2>
            <p className="text-sm text-gray-400">입력하신 소중한 정보를 바탕으로<br />{formData.name}님만을 위한 맞춤 리포트를 생성합니다.</p>
            <div className="space-y-3 mt-8">
              <ConsentItem label="건강 정보 활용 및 분석에 동의합니다 (필수)" checked={formData.consentHealth} onChange={(v: boolean) => setFormData({ ...formData, consentHealth: v })} />
              <ConsentItem label="AI 기반 영양 가이드 제공에 동의합니다 (필수)" checked={formData.consentAI} onChange={(v: boolean) => setFormData({ ...formData, consentAI: v })} />
            </div>
          </div>
        )}

        <div className="mt-auto pt-10 flex space-x-3">
          {(step > 1 || (step === 1 && onBack)) && (
            <button onClick={() => {
              if (step === 1 && onBack) {
                onBack();
              } else {
                // 뒤로가기 시 심화단계 건너뛰기 대응
                if (step === 5 && (selectedConditions.includes('일반건강') && selectedConditions.length === 1)) setStep(3); // 5->3
                else setStep(step - 1);
              }
            }} className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold active:scale-95 transition-all flex items-center space-x-2">
              <ChevronLeft size={20} />

            </button>
          )}
          <button onClick={nextStep} className="flex-1 bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all">
            <span>{step === totalSteps ? '리포트 생성하기' : '다음 단계'}</span>
            {step < totalSteps && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div >
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "", icon }: any) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-400 font-bold ml-1 flex items-center">{icon && <span className="mr-1 text-primary">{icon}</span>}{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} placeholder={placeholder} className="w-full p-4 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-800" />
  </div>
);

const HabitSelect = ({ label, options, value, onChange, enlarged = false }: any) => (
  <div className={enlarged ? "space-y-3" : "space-y-2"}>
    <p className={`font-bold ml-1 ${enlarged ? 'text-base text-gray-700' : 'text-xs text-gray-400'}`}>
      {label}
    </p>

    <div className={`flex flex-wrap rounded-xl gap-2 ${enlarged ? 'p-2' : 'p-1'}`}>
      {options.map((opt: string) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 min-w-[80px] rounded-xl font-bold transition-all border-2 ${enlarged ? 'py-3.5 text-sm' : 'py-2.5 text-[10px]'
            } ${value === opt
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-gray-100 bg-white text-black hover:border-gray-200'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);


const MultiSelect = ({ label, options, values, onChange }: any) => {
  const toggleOption = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v: string) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-bold ml-1">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => toggleOption(opt)}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all border-2 text-sm ${values.includes(opt)
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
          >
            <span className="flex items-center gap-2">
              {opt}
              {values.includes(opt) && <CheckCircle2 size={14} className="text-primary" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ConsentItem = ({ label, checked, onChange }: any) => (
  <button onClick={() => onChange(!checked)} className={`w-full p-4 rounded-2xl border-2 flex items-center text-left transition-all ${checked ? 'border-primary bg-primary/5' : 'border-gray-50 bg-white'}`}>
    <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center ${checked ? 'bg-primary border-primary text-white' : 'border-gray-200'}`}>{checked && <CheckCircle2 size={12} />}</div>
    <span className="text-xs font-bold text-gray-700">{label}</span>
  </button>
);

const ScrollPicker = ({ label, value, options, onChange, unit = '' }: any) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 48;
  const visibleItems = 5;
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [centerIndex, setCenterIndex] = React.useState(() => {
    const idx = options.indexOf(value || options[0]);
    return idx !== -1 ? idx : 0;
  });

  // 초기값 설정 및 스크롤 위치 설정
  React.useEffect(() => {
    if (isInitialized) return;

    const initialValue = value || options[0];
    const index = options.indexOf(initialValue);
    const targetIndex = index !== -1 ? index : 0;

    setCenterIndex(targetIndex);

    if (scrollRef.current) {
      scrollRef.current.scrollTop = targetIndex * itemHeight;
    }

    if (!value) {
      onChange(options[0]);
    }

    setIsInitialized(true);
  }, [options, value, isInitialized, onChange, itemHeight]);

  // 스크롤 이벤트 핸들러
  React.useEffect(() => {
    const ref = scrollRef.current;
    if (!ref) return;

    let scrollTimeout: number;
    let animationFrameId: number;

    const handleScroll = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const scrollTop = ref.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        const clampedIndex = Math.max(0, Math.min(options.length - 1, index));

        // 실시간으로 중앙 인덱스 업데이트 (UI 즉시 반영)
        setCenterIndex(clampedIndex);
      });
    };

    const handleScrollEnd = () => {
      const scrollTop = ref.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(options.length - 1, index));
      const newValue = options[clampedIndex];

      // 스크롤 종료 시 onChange 호출
      onChange(newValue);

      ref.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      });
    };

    const onScroll = () => {
      handleScroll();
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(handleScrollEnd, 100);
    };

    ref.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ref.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimeout);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [options, onChange, itemHeight]);

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 font-bold ml-1">{label}</label>
      <div className="relative bg-gray-50 rounded-xl overflow-hidden" style={{ height: `${itemHeight * visibleItems}px` }}>
        <div
          ref={scrollRef}
          className="overflow-y-scroll h-full no-scrollbar"
          style={{
            scrollSnapType: 'y mandatory',
            paddingTop: `${itemHeight * 2}px`,
            paddingBottom: `${itemHeight * 2}px`
          }}
        >
          {options.map((option: string, index: number) => (
            <div
              key={index}
              className="flex items-center justify-center transition-all"
              style={{
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center'
              }}
            >
              <span
                className={`font-bold transition-all duration-150 ${centerIndex === index
                  ? 'text-2xl text-gray-900'
                  : 'text-base text-gray-300'
                  }`}
              >
                {option}
                {centerIndex === index && unit && (
                  <span className="ml-1 text-lg text-gray-500">{unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* 선택 영역 표시 */}
        <div
          className="absolute left-0 right-0 border-t-2 border-b-2 border-primary/20 bg-primary/5 pointer-events-none"
          style={{
            top: `${itemHeight * 2}px`,
            height: `${itemHeight}px`
          }}
        />

        {/* 상단/하단 그라디언트 */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default Diagnosis;
