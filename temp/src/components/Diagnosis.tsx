
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
  diseaseDetails?: any; // 추가된 정밀 정보
  userId?: string; // 백엔드 통신용 ID
}

interface DiagnosisProps {
  onComplete: (result: DiagnosisResult) => void;
  onNavigate: (tab: any) => void;
  selectedConditions: string[];
  onConditionsChange: (conditions: string[]) => void;
  initialName?: string;
}

const Diagnosis: React.FC<DiagnosisProps> = ({
  onComplete,
  onNavigate,
  selectedConditions,
  onConditionsChange,
  initialName = ''
}) => {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 기본 7단계 (건강관심사 제거로 총 7단계)
  const totalSteps = 7;

  const [formData, setFormData] = useState({
    name: initialName,
    gender: '여성',
    age: '',
    height: '',
    weight: '',
    interests: [] as string[],
    // 질환별 정밀 정보
    diseaseDetails: {
      diabetes: { hbA1c: '', year: '', medType: [] as string[] },
      hypertension: { avgBP: '', meds: '복용중' },
      kidney: { gfr: '', dialysis: '안함' },
      lipid: { ldl: '', hdl: '' }
    },
    healthMetrics: {
      bloodSugar: '',
      bloodPressure: '',
      cholesterol: '',
    },
    eatingHabits: {
      veggieFrequency: '주 1-2회',
      sugarIntake: '보통',
      meatType: '살코기 위주',
      saltLevel: '보통',
    },
    activity: '보통',
    alcohol: '없음',
    smoking: '비흡연',
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
    if (step === 2 && selectedConditions.length === 0) return alert("최소 하나 이상의 질환 또는 '일반건강'을 선택해주세요.");

    // 심화 질문 단계(3단계) 건너뛰기 로직
    // '일반건강'만 선택했거나 질환 정보가 필요 없는 경우 4단계로 바로 이동 가능
    if (step === 2 && (selectedConditions.includes('일반건강') && selectedConditions.length === 1)) {
      setStep(4);
      return;
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
        diseaseDetails: formData.diseaseDetails
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
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold ml-1">성별</label>
                  <div className="flex bg-gray-50 rounded-xl p-1">
                    {['남성', '여성'].map(g => (
                      <button key={g} onClick={() => setFormData({ ...formData, gender: g })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.gender === g ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <Input label="나이 (세)" value={formData.age} onChange={(v: string) => setFormData({ ...formData, age: v })} type="number" placeholder="40" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="키 (cm)" value={formData.height} onChange={(v: string) => setFormData({ ...formData, height: v })} type="number" placeholder="170" />
                <Input label="체중 (kg)" value={formData.weight} onChange={(v: string) => setFormData({ ...formData, weight: v })} type="number" placeholder="65" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-900">2️⃣ 주요 질환 관리</h2>
            <p className="text-xs text-gray-400 -mt-4">현재 관리 중인 질환을 선택해주세요. (중복 가능)</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: '당뇨병', icon: <Droplets size={18} /> },
                { id: '고혈압', icon: <Activity size={18} /> },
                { id: '고지혈증', icon: <Thermometer size={18} /> },
                { id: '비만', icon: <User size={18} /> },
                { id: '신부전', icon: <Stethoscope size={18} /> },
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

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-black text-gray-900">3️⃣ 질환별 정밀 정보</h2>
            <p className="text-xs text-gray-400 -mt-4">선택하신 질환의 상세 관리 상태를 알려주세요.</p>

            <div className="space-y-6">
              {selectedConditions.includes('당뇨병') && (
                <div className="bg-white p-6 rounded-[28px] border border-blue-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-blue-600 font-bold mb-2">
                    <Droplets size={18} /> <span>당뇨병 정밀 정보</span>
                  </div>
                  <Input label="당화혈색소 (HbA1c, %)" value={formData.diseaseDetails.diabetes.hbA1c} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, hbA1c: v } } })} type="number" placeholder="6.5" />
                  <MultiSelect
                    label="치료 방식 (복수 선택 가능)"
                    options={['경구제', '인슐린', '조절안함']}
                    values={formData.diseaseDetails.diabetes.medType}
                    onChange={(v: string[]) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, diabetes: { ...formData.diseaseDetails.diabetes, medType: v } } })}
                  />
                </div>
              )}

              {selectedConditions.includes('고혈압') && (
                <div className="bg-white p-6 rounded-[28px] border border-rose-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-rose-600 font-bold mb-2">
                    <Activity size={18} /> <span>고혈압 정밀 정보</span>
                  </div>
                  <Input label="최근 평균 혈압 (수축기)" value={formData.diseaseDetails.hypertension.avgBP} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, hypertension: { ...formData.diseaseDetails.hypertension, avgBP: v } } })} type="number" placeholder="130" />
                  <HabitSelect label="약물 복용 상태" options={['복용중', '간헐적 복용', '복용안함']} value={formData.diseaseDetails.hypertension.meds} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, hypertension: { ...formData.diseaseDetails.hypertension, meds: v } } })} />
                </div>
              )}

              {selectedConditions.includes('신부전') && (
                <div className="bg-white p-6 rounded-[28px] border border-purple-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-purple-600 font-bold mb-2">
                    <Stethoscope size={18} /> <span>신부전 정밀 정보</span>
                  </div>
                  <Input label="사구체여과율 (eGFR)" value={formData.diseaseDetails.kidney.gfr} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, kidney: { ...formData.diseaseDetails.kidney, gfr: v } } })} type="number" placeholder="60" />
                  <HabitSelect label="투석 여부" options={['안함', '복막투석', '혈액투석']} value={formData.diseaseDetails.kidney.dialysis} onChange={(v: string) => setFormData({ ...formData, diseaseDetails: { ...formData.diseaseDetails, kidney: { ...formData.diseaseDetails.kidney, dialysis: v } } })} />
                </div>
              )}

              {(!selectedConditions.some(c => ['당뇨병', '고혈압', '신부전'].includes(c))) && (
                <div className="bg-gray-50 p-10 rounded-[28px] text-center border-2 border-dashed border-gray-200">
                  <p className="text-sm text-gray-400 font-bold">추가 정보가 필요한 질환이 없습니다.<br />다음 단계로 이동해주세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-black text-gray-900">4️⃣ 건강 지표 기록</h2>
            <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-5">
              <Input label="공복 혈당 (mg/dL)" value={formData.healthMetrics.bloodSugar} onChange={(v: string) => setFormData({ ...formData, healthMetrics: { ...formData.healthMetrics, bloodSugar: v } })} type="number" placeholder="95" />
              <Input label="수축기 혈압 (mmHg)" value={formData.healthMetrics.bloodPressure} onChange={(v: string) => setFormData({ ...formData, healthMetrics: { ...formData.healthMetrics, bloodPressure: v } })} type="number" placeholder="120" />
              <Input label="총 콜레스테롤 (mg/dL)" value={formData.healthMetrics.cholesterol} onChange={(v: string) => setFormData({ ...formData, healthMetrics: { ...formData.healthMetrics, cholesterol: v } })} type="number" placeholder="190" />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-black text-gray-900">5️⃣ 정밀 식습관 분석</h2>
            <div className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm space-y-7">
              <HabitSelect label="식이섬유: 채소 섭취 빈도" options={['매 끼니', '하루 1회', '주 3-4회', '거의 안 함']} value={formData.eatingHabits.veggieFrequency} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, veggieFrequency: v } })} enlarged />
              <HabitSelect label="당류: 단 음료/디저트 섭취" options={['거의 안 함', '주 1-2회', '매일 1회', '매일 2회 이상']} value={formData.eatingHabits.sugarIntake} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, sugarIntake: v } })} enlarged />
              <HabitSelect label="지방: 주로 섭취하는 육류" options={['살코기/생선', '적당한 지방', '기름진 부위', '가공육(햄 등)']} value={formData.eatingHabits.meatType} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, meatType: v } })} enlarged />
              <HabitSelect label="나트륨: 음식의 간 정도" options={['싱겁게', '보통', '짜게', '매우 짜게']} value={formData.eatingHabits.saltLevel} onChange={(v: string) => setFormData({ ...formData, eatingHabits: { ...formData.eatingHabits, saltLevel: v } })} enlarged />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-black text-gray-900">6️⃣ 생활 패턴 분석</h2>
            <div className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm space-y-7">
              <HabitSelect label="일일 활동 수준" options={['거의 좌식', '가벼운 활동', '보통 활동', '강한 활동']} value={formData.activity} onChange={(v: string) => setFormData({ ...formData, activity: v })} enlarged />
              <div className="grid grid-cols-2 gap-5">
                <HabitSelect label="음주" options={['안 함', '가끔', '자주']} value={formData.alcohol} onChange={(v: string) => setFormData({ ...formData, alcohol: v })} enlarged />
                <HabitSelect label="흡연" options={['비흡연', '과거', '현재']} value={formData.smoking} onChange={(v: string) => setFormData({ ...formData, smoking: v })} enlarged />
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
          {step > 1 && (
            <button onClick={() => {
              // 뒤로가기 시 심화단계 건너뛰기 대응
              if (step === 4 && (selectedConditions.includes('일반건강') && selectedConditions.length === 1)) setStep(2);
              else setStep(step - 1);
            }} className="p-4 rounded-2xl bg-gray-100 text-gray-400 font-bold active:scale-95 transition-all">
              <ChevronLeft size={24} />
            </button>
          )}
          <button onClick={nextStep} className="flex-1 bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all">
            <span>{step === totalSteps ? '리포트 생성하기' : '다음 단계'}</span>
            {step < totalSteps && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
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
    <p className={`font-bold ml-1 ${enlarged ? 'text-base text-gray-700' : 'text-xs text-gray-400'}`}>{label}</p>
    <div className={`flex flex-wrap rounded-xl gap-2 ${enlarged ? 'p-2' : 'p-1'}`}>
      {options.map((opt: string) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 min-w-[80px] rounded-xl font-bold transition-all border-2 ${enlarged ? 'py-3.5 text-sm' : 'py-2.5 text-[10px]'} ${
            value === opt
              ? 'border-primary bg-primary/5 text-primary shadow-sm'
              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
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
            className={`px-4 py-2.5 rounded-xl font-bold transition-all border-2 text-sm ${
              values.includes(opt)
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

export default Diagnosis;
