
import React from 'react';
import { Utensils, Info, Sparkles } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';

interface HealthyDietProps {
  diagnosisData: DiagnosisResult | null;
}

const HealthyDiet: React.FC<HealthyDietProps> = ({ diagnosisData }) => {
  const healthyMeals = [
    { title: '지중해식 샐러드', cal: '320kcal', tag: '항산화', img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80' },
    { title: '수비드 닭가슴살 한끼', cal: '410kcal', tag: '고단백', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80' },
    { title: '구운 야채와 현미밥', cal: '380kcal', tag: '식이섬유', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80' },
    { title: '연어 스테이크 정식', cal: '450kcal', tag: '오메가3', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80' },
  ];

  return (
    <div className="flex flex-col h-full bg-white pb-24 overflow-y-auto">
      <header className="px-5 py-6 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center space-x-2 text-[#94a01a]">
          <Utensils size={24} />
          <h1 className="text-xl font-bold text-gray-900">건강식단</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 italic">CareMeal이 제안하는 균형 영양 한끼</p>
      </header>

      <div className="p-5 space-y-6">
        {diagnosisData ? (
          <div className="bg-primary/5 p-5 rounded-[24px] border border-primary/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={40} />
             </div>
             <h3 className="font-bold text-primary text-sm mb-2 flex items-center">
                <Sparkles size={14} className="mr-1" /> 환자님을 위한 진단 맞춤 추천
             </h3>
             <p className="text-xs text-gray-600 leading-relaxed">
                BMI <strong>{diagnosisData.bmi}</strong>와 <strong>{diagnosisData.weightStatus}</strong> 상태를 고려하여, 
                포만감이 높으면서도 칼로리 부담이 적은 식단을 우선 배치했습니다.
             </p>
          </div>
        ) : (
          <div className="bg-orange-50 p-4 rounded-2xl flex items-start space-x-3 border border-orange-100">
            <Info size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-800 leading-relaxed font-medium">
              '영양진단'을 완료하시면 환자분의 체형과 식습관에 딱 맞는 식단을 추천해드릴 수 있습니다.
            </p>
          </div>
        )}

        <div className="grid gap-5">
          {healthyMeals.map((meal, idx) => (
            <div key={idx} className="flex bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
              <div className="w-28 h-28 flex-shrink-0 overflow-hidden">
                <img src={meal.img} alt={meal.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-4 flex flex-col justify-center flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase">{meal.tag}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{meal.cal}</span>
                </div>
                <h3 className="font-bold text-gray-900 leading-tight">{meal.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthyDiet;
