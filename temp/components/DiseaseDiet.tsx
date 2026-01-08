
import React, { useState, useEffect } from 'react';
import { HeartPulse, Ban, CheckCircle, Lightbulb, Sparkles } from 'lucide-react';

interface DiseaseDietProps {
  selectedConditions: string[];
}

const DiseaseDiet: React.FC<DiseaseDietProps> = ({ selectedConditions }) => {
  const [activeTab, setActiveTab] = useState('당뇨');

  const diseases = [
    { 
      name: '당뇨', 
      desc: '혈당 스파이크 방지',
      dos: ['현미/잡곡밥', '식이섬유 채소', '양질의 단백질'],
      donts: ['설탕/시럽', '흰 밀가루 가공식품', '과일 주스'],
      color: 'bg-blue-500'
    },
    { 
      name: '고혈압', 
      desc: '저염식 및 DASH 식단',
      dos: ['칼륨 풍부 채소', '견과류', '저지방 유제품'],
      donts: ['짠 장류', '국물 요리', '인스턴트 식품'],
      color: 'bg-red-500'
    },
    { 
      name: '고지혈증', 
      desc: '콜레스테롤 및 중성지방 관리',
      dos: ['오메가3 풍부 생선', '해조류', '불포화지방산'],
      donts: ['동물성 지방', '튀김류', '단순 당질'],
      color: 'bg-yellow-500'
    },
    { 
      name: '비만', 
      desc: '저칼로리 고영양 식단',
      dos: ['수분 섭취', '포만감 높은 단백질', '천천히 씹기'],
      donts: ['심야 야식', '고칼로리 소스', '탄산음료'],
      color: 'bg-green-500'
    },
    { 
      name: '신부전', 
      desc: '단백질 및 전해질 제한',
      dos: ['정해진 양의 단백질', '칼륨 조절 채소', '적정 수분'],
      donts: ['고칼륨 과일', '가공육', '고인산 식품'],
      color: 'bg-purple-500'
    }
  ];

  useEffect(() => {
    if (selectedConditions.length > 0) {
      // 진단에서 선택된 질환이 있다면 첫 번째 질환을 활성 탭으로 설정
      setActiveTab(selectedConditions[0]);
    }
  }, [selectedConditions]);

  const current = diseases.find(d => d.name === activeTab) || diseases[0];
  const isSelectedByDiagnosis = selectedConditions.includes(activeTab);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] pb-24 overflow-y-auto">
      <header className="px-5 py-6 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center space-x-2 text-rose-500 mb-4">
          <HeartPulse size={24} />
          <h1 className="text-xl font-bold text-gray-900">질환맞춤 가이드</h1>
        </div>
        
        <div className="flex overflow-x-auto no-scrollbar space-x-2">
          {diseases.map((d) => {
            const isUserCondition = selectedConditions.includes(d.name);
            return (
              <button
                key={d.name}
                onClick={() => setActiveTab(d.name)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all relative ${
                  activeTab === d.name 
                  ? 'bg-gray-900 text-white shadow-md scale-105' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {d.name}
                {isUserCondition && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="p-5 space-y-6">
        {isSelectedByDiagnosis && (
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center space-x-2 animate-fadeIn">
            <Sparkles size={16} className="text-rose-500" />
            <span className="text-xs font-bold text-rose-700">영양진단에서 선택하신 맞춤 가이드입니다.</span>
          </div>
        )}

        <div className={`p-7 rounded-[32px] text-white shadow-xl relative overflow-hidden transition-all duration-500 ${current.color}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <h2 className="text-2xl font-black mb-1 relative">{current.name} 맞춤 처방</h2>
          <p className="text-white/80 text-sm font-medium relative">{current.desc}</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100">
            <div className="flex items-center text-green-600 font-bold mb-4">
              <CheckCircle size={20} className="mr-2" />
              적극 권장 (Good For You)
            </div>
            <div className="flex flex-wrap gap-2">
              {current.dos.map((item, i) => (
                <span key={i} className="bg-green-50 text-green-700 px-3.5 py-2 rounded-xl text-sm font-bold border border-green-100/50">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100">
            <div className="flex items-center text-red-500 font-bold mb-4">
              <Ban size={20} className="mr-2" />
              피해야 할 음식 (Avoid)
            </div>
            <div className="flex flex-wrap gap-2">
              {current.donts.map((item, i) => (
                <span key={i} className="bg-red-50 text-red-600 px-3.5 py-2 rounded-xl text-sm font-bold border border-red-100/50">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50/50 p-6 rounded-[28px] border border-blue-100 relative">
          <div className="absolute -top-3 -right-3 bg-blue-500 text-white p-2 rounded-full shadow-lg">
            <Lightbulb size={20} />
          </div>
          <h3 className="font-bold text-blue-900 mb-2">💡 김닥터의 집중 가이드</h3>
          <p className="text-sm text-blue-800 leading-relaxed font-medium">
            {activeTab} 관리의 핵심은 균형 잡힌 영양 섭취입니다. 
            진단 결과를 바탕으로 제안된 권장/주의 식품을 확인하시고, 김닥터와 상담을 통해 상세 레시피를 만들어보세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiseaseDiet;
