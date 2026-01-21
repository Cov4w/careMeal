import React, { useState, useEffect } from 'react';
import { Printer, Info, Mail, RefreshCcw, ClipboardCheck, ArrowLeft, Share2, Download } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';

interface DiagnosisResultViewProps {
  data: DiagnosisResult;
  onClose: () => void;
  onRetry: () => void;
  onUpdate?: () => void; // New prop
}

const DiagnosisResultView: React.FC<DiagnosisResultViewProps> = ({ data: propData, onClose, onRetry, onUpdate }) => {
  const [data, setData] = useState<DiagnosisResult>(propData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // --- Logic from HEAD: Refresh Mechanism ---
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // Use summary (formData) if available, otherwise minimal fallback
      const payload = {
        user_id: data.userId || data.name,
        user_profile: {
          ...(data.summary || {}),
          conditions: data.conditions
        }
      };

      const response = await fetch('http://127.0.0.1:8000/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const apiRes = await response.json();
        setData(prev => ({
          ...prev,
          habitScore: apiRes.eatScore,
          prescriptions: apiRes.prescriptions,
          conditions: apiRes.conditions || prev.conditions
        }));
        if (onUpdate) onUpdate(); // Notify parent
      } else {
        // Fallback to retry prop if needed
        if (onRetry) onRetry();
      }
    } catch (e) {
      console.error("Refresh failed", e);
      if (onRetry) onRetry();
    } finally {
      setTimeout(() => setIsRefreshing(false), 700);
    }
  };

  // Auto-refresh on mount (access time)
  useEffect(() => {
    handleRefresh();
  }, []);

  const reportDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').slice(0, -1);
  const eatScore = data.habitScore || 0;

  // --- Logic from Develop: Personalized Nutrition Engine ---
  const weight = parseFloat(data.weight) || 70;
  const height = parseFloat(data.height) || 170;
  const age = parseFloat(data.age) || 55;
  const gender = data.gender || '남성';
  const conditions = data.conditions || [];

  // 1. 기초대사량 (Mifflin-St Jeor 공식)
  let bmr = 0;
  if (gender === '남성') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }

  // 2. 활동 계수 (기본 1.375 적용) & 권장 칼로리 산출
  let recommendedCalories = Math.round(bmr * 1.375);

  // 체중 상태에 따른 소폭 조정 (과체중 시 감량 유도)
  if (data.weightStatus === '비만' || data.weightStatus === '과체중') {
    recommendedCalories -= 200;
  } else if (data.weightStatus === '저체중') {
    recommendedCalories += 200;
  }

  // 3. 탄단지 비율 산출 (질환 고려)
  let carbRatio = 0.50; // 50%
  let proteinRatio = 0.20; // 20%
  let fatRatio = 0.30; // 30%

  // [신부전/콩팥병 특화] 단백질 제한 (몸무게 kg당 0.8g 권장)
  const isKidneyPatient = conditions.some(c => c.includes('신부전') || c.includes('콩팥'));
  if (isKidneyPatient) {
    const kidneyProteinGrams = weight * 0.8;
    proteinRatio = (kidneyProteinGrams * 4) / recommendedCalories;
    // 남은 비율을 탄수화물과 지방으로 배분
    const remaining = 1 - proteinRatio;
    carbRatio = remaining * 0.65;
    fatRatio = remaining * 0.35;
  }

  const carbs = Math.round((recommendedCalories * carbRatio) / 4);
  const protein = Math.round((recommendedCalories * proteinRatio) / 4);
  const fat = Math.round((recommendedCalories * fatRatio) / 9);

  return (
    <div className="absolute inset-0 z-[50] flex flex-col bg-white animate-fadeIn overflow-hidden">
      {/* Header with Safe Area */}
      <header className="px-5 pb-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] bg-white border-b border-gray-50 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 active:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <ClipboardCheck size={20} className="text-primary" />
            <h1 className="text-lg font-black text-gray-900">영양 정밀 리포트</h1>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-2 text-gray-400 active:text-primary transition-colors ${isRefreshing ? 'animate-spin text-primary' : ''}`}
          >
            <RefreshCcw size={20} />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsShareOpen(!isShareOpen)}
              className={`p-2 transition-colors rounded-full ${isShareOpen ? 'text-primary bg-primary/5' : 'text-gray-400 active:text-primary active:bg-gray-100'}`}
            >
              <Share2 size={20} />
            </button>

            {isShareOpen && (
              <>
                {/* Global Backdrop - Close on click */}
                <div
                  className="fixed inset-0 z-40 bg-black/5"
                  onClick={() => setIsShareOpen(false)}
                />

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 animate-slideUp overflow-hidden">
                  <button
                    onClick={() => {
                      alert('메일 전송 기능이 준비 중입니다.');
                      setIsShareOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                      <Mail size={16} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">메일 전송</span>
                  </button>

                  <div className="h-px bg-gray-50 mx-2" />

                  <button
                    onClick={() => {
                      window.print();
                      setIsShareOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                      <Printer size={16} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">리포트 인쇄</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 bg-[#f8fafc]">
        {/* User Profile Card */}
        <div className="px-5 py-8 bg-white rounded-b-[40px] shadow-sm mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Diagnosis Target</p>
              <h2 className="text-2xl font-black text-gray-900 leading-none">
                {data.name} <span className="text-gray-300 font-bold text-lg">님</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 mb-1">분석 일자</p>
              <p className="text-xs font-black text-gray-700">{reportDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">신체 정보</p>
              <p className="text-sm font-black text-gray-800">{data.gender} / {data.age}세 / {data.height}cm</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">관리 질환</p>
              <p className="text-sm font-black text-gray-800 truncate">{data.conditions?.join(', ') || '일반건강'}</p>
            </div>
          </div>
        </div>

        {/* EAT SCORE Visualizer */}
        <section className="mx-5 mb-6 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-black text-gray-900">EAT SCORE</h3>
            <div className="w-8 h-8 bg-primary/5 rounded-full flex items-center justify-center text-primary">
              <Info size={14} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-8 font-medium">영양 균형 및 식습관 종합 점수</p>

          <div className="flex flex-col items-center py-4">
            <div className="relative mb-10">
              <div className="text-6xl font-black text-primary tracking-tighter">
                {eatScore}<span className="text-gray-300 text-2xl ml-1">/100</span>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                Excellent
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-primary rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, eatScore))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-gray-300 uppercase tracking-widest px-1">
                <span>Critical</span>
                <span>Normal</span>
                <span>Optimal</span>
              </div>
            </div>
          </div>
        </section>

        {/* BMI & Energy Section */}
        <section className="mx-5 mb-6 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-900 mb-1">체형 및 에너지 분석</h3>
          <p className="text-xs text-gray-400 mb-8 font-medium">BMI 지수 기반 맞춤 권장 칼로리</p>

          <div className="flex items-center space-x-6 mb-10 bg-gray-50 p-6 rounded-3xl">
            <div className="flex-shrink-0 w-16 h-16 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase">BMI</span>
              <span className="text-xl font-black text-gray-900">{data.bmi}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">
                <span className="text-primary">{data.weightStatus}</span> 상태입니다.
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed font-medium">
                체중 유지를 위해 하루 <span className="text-gray-900 font-black">{recommendedCalories.toLocaleString()}kcal</span> 섭취를 권장합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NutrientMiniCard label="탄수화물" value={`${carbs}g`} color="bg-orange-500" />
            <NutrientMiniCard label="단백질" value={`${protein}g`} color="bg-blue-500" />
            <NutrientMiniCard label="지방" value={`${fat}g`} color="bg-emerald-500" />
          </div>
        </section>

        {/* Prescription / Action Items */}
        <section className="mx-5 mb-10 bg-gray-900 p-8 rounded-[40px] text-white shadow-xl shadow-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Download size={20} className="text-primary-light" />
            </div>
            <h3 className="text-lg font-black tracking-tight">김닥터의 핵심 처방</h3>
          </div>

          <ul className="space-y-4">
            {(data.prescriptions || [
              "매일 규칙적인 시간에 식사하기",
              "단순 당질(시럽, 설탕) 섭취 20% 줄이기",
              "식후 30분 가벼운 산책 습관화"
            ]).map((text, i) => (
              <li key={i} className="flex items-start space-x-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="mt-1 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-sm font-bold text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

const NutrientMiniCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
    <div className={`w-2 h-2 ${color} rounded-full mx-auto mb-2`} />
    <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
    <p className="text-sm font-black text-gray-900">{value}</p>
  </div>
);

export default DiagnosisResultView;
