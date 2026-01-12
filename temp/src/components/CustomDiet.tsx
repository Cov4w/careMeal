
import React, { useState, useMemo, useRef } from 'react';
import { Heart, Clock, Flame, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';

interface CustomDietProps {
  diagnosisData: DiagnosisResult | null;
  selectedConditions: string[];
}

interface Recipe {
  id: number;
  title: string;
  calories: number;
  time: number;
  image: string;
  condition: string;
  dietType: string;
}

const CustomDiet: React.FC<CustomDietProps> = ({ selectedConditions }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 사용자가 선택한 질환 중 첫 번째를 기준으로 하되, 없으면 일반건강
  const primaryCondition = selectedConditions.length > 0 ? selectedConditions[0] : '일반건강';
  
  const [activePreference, setActivePreference] = useState('고단백');

  const preferences = [
    { name: '고기', icon: '🥩', color: 'bg-rose-50', activeColor: 'ring-rose-500 bg-rose-100' },
    { name: '해산물', icon: '🐟', color: 'bg-blue-50', activeColor: 'ring-blue-500 bg-blue-100' },
    { name: '가금류', icon: '🐔', color: 'bg-orange-50', activeColor: 'ring-orange-500 bg-orange-100' },
    { name: '채식(비건)', icon: '🥗', color: 'bg-emerald-50', activeColor: 'ring-emerald-500 bg-emerald-100' },
    { name: '고단백', icon: '💪', color: 'bg-indigo-50', activeColor: 'ring-indigo-500 bg-indigo-100' },
  ];

  const allRecipes: Recipe[] = [
    // --- 당뇨병 (저당, 고식이섬유) ---
    { id: 1, title: '소고기 야채 볶음 (저당)', calories: 420, time: 20, image: 'https://images.unsplash.com/photo-1534939561126-755ecf116a9c?w=400&q=80', condition: '당뇨병', dietType: '고기' },
    { id: 2, title: '구운 연어와 아스파라거스', calories: 380, time: 25, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80', condition: '당뇨병', dietType: '해산물' },
    { id: 3, title: '수비드 닭가슴살 샐러드', calories: 310, time: 15, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', condition: '당뇨병', dietType: '가금류' },
    { id: 4, title: '두부 아보카도 포케', calories: 340, time: 10, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80', condition: '당뇨병', dietType: '채식(비건)' },
    { id: 5, title: '현미 니기리 스시 세트', calories: 450, time: 30, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80', condition: '당뇨병', dietType: '고단백' },

    // --- 고혈압 (저나트륨, DASH 식단) ---
    { id: 11, title: '저염 소불고기 쌈밥', calories: 450, time: 20, image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80', condition: '고혈압', dietType: '고기' },
    { id: 12, title: '데친 문어와 미역 초무침', calories: 280, time: 15, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80', condition: '고혈압', dietType: '해산물' },
    { id: 13, title: '견과류 닭안심 찜', calories: 330, time: 30, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80', condition: '고혈압', dietType: '가금류' },
    { id: 14, title: '바나나 시금치 스무디볼', calories: 260, time: 10, image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&q=80', condition: '고혈압', dietType: '채식(비건)' },
    { id: 15, title: '검은콩 귀노아 볶음밥', calories: 410, time: 20, image: 'https://images.unsplash.com/photo-1512058560366-cd2429555614?w=400&q=80', condition: '고혈압', dietType: '고단백' },

    // --- 고지혈증 (저포화지방, 고오메가3) ---
    { id: 21, title: '기름기 뺀 수육과 부추겉절이', calories: 480, time: 60, image: 'https://images.unsplash.com/photo-1529692236671-f1f6e9481bfa?w=400&q=80', condition: '고지혈증', dietType: '고기' },
    { id: 22, title: '고등어 카레 구이', calories: 360, time: 20, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80', condition: '고지혈증', dietType: '해산물' },
    { id: 23, title: '들깨 닭가슴살 미역국', calories: 290, time: 25, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80', condition: '고지혈증', dietType: '가금류' },
    { id: 24, title: '렌틸콩 월남쌈', calories: 320, time: 20, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80', condition: '고지혈증', dietType: '채식(비건)' },
    { id: 25, title: '낫또와 야채 비빔밥', calories: 390, time: 10, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80', condition: '고지혈증', dietType: '고단백' },

    // --- 비만 (저칼로리, 고포만감) ---
    { id: 31, title: '우둔살 스테이크 샐러드', calories: 350, time: 15, image: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?w=400&q=80', condition: '비만', dietType: '고기' },
    { id: 32, title: '흰살생선 야채 찜', calories: 240, time: 20, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db76?w=400&q=80', condition: '비만', dietType: '해산물' },
    { id: 33, title: '닭가슴살 월남쌈', calories: 280, time: 20, image: 'https://images.unsplash.com/photo-1539136788836-5699e78bac75?w=400&q=80', condition: '비만', dietType: '가금류' },
    { id: 34, title: '곤약 야채 볶음면', calories: 180, time: 15, image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&q=80', condition: '비만', dietType: '채식(비건)' },
    { id: 35, title: '달걀 흰자 머핀과 샐러드', calories: 220, time: 15, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80', condition: '비만', dietType: '고단백' },

    // --- 신부전 (저단백 정밀, 저인/저칼륨) ---
    { id: 41, title: '소고기 야채 말이 (소량)', calories: 310, time: 25, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80', condition: '신부전', dietType: '고기' },
    { id: 42, title: '데친 새우와 무나물', calories: 210, time: 15, image: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=400&q=80', condition: '신부전', dietType: '해산물' },
    { id: 43, title: '백숙 국물 없는 살코기', calories: 250, time: 40, image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80', condition: '신부전', dietType: '가금류' },
    { id: 44, title: '양배추 롤과 쌀밥', calories: 290, time: 20, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80', condition: '신부전', dietType: '채식(비건)' },
    { id: 45, title: '조절된 양의 두부 부침', calories: 200, time: 10, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', condition: '신부전', dietType: '고단백' },

    // --- 일반건강 (균형 영양) ---
    { id: 51, title: '한우 안심 스테이크', calories: 580, time: 20, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80', condition: '일반건강', dietType: '고기' },
    { id: 52, title: '전복 버터 구이와 마늘', calories: 420, time: 15, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db76?w=400&q=80', condition: '일반건강', dietType: '해산물' },
    { id: 53, title: '치킨 브레스트 아보카도 샌드위치', calories: 450, time: 10, image: 'https://images.unsplash.com/photo-1521390188846-e2a39b7ef4a8?w=400&q=80', condition: '일반건강', dietType: '가금류' },
    { id: 54, title: '그리스식 샐러드와 페타치즈', calories: 310, time: 10, image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80', condition: '일반건강', dietType: '채식(비건)' },
    { id: 55, title: '단백질 쉐이크와 견과류 세트', calories: 350, time: 5, image: 'https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=400&q=80', condition: '일반건강', dietType: '고단백' },
  ];

  const filteredRecipes = useMemo(() => {
    // 질환과 식이 선호도가 모두 일치하는 레시피 추출
    return allRecipes.filter(recipe => 
      recipe.condition === primaryCondition && 
      recipe.dietType === activePreference
    );
  }, [primaryCondition, activePreference]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollAmount = 240;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white pb-24 overflow-y-auto no-scrollbar relative font-sans">
      {/* Header */}
      <header className="px-5 py-6 flex items-center justify-center sticky top-0 bg-white/95 backdrop-blur-sm z-30 border-b border-gray-50">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          {primaryCondition.replace('병', '')} 맞춤 식단
        </h1>
      </header>

      {/* Dietary Preferences Section */}
      <div className="mt-8 relative">
        <div className="px-5 flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900 flex items-center">
            식이 선호도 <Sparkles size={16} className="ml-2 text-primary/60" />
          </h3>
          
          {/* Navigation Arrows: Moved to the right of the header */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => scroll('left')}
              className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:bg-primary/10 hover:text-primary border border-gray-100 shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:bg-primary/10 hover:text-primary border border-gray-100 shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        {/* Scrollable Container */}
        <div className="relative overflow-visible">
          <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white via-white/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white via-white/50 to-transparent z-10 pointer-events-none" />
          
          <div 
            ref={scrollRef}
            className="flex flex-nowrap overflow-x-auto no-scrollbar space-x-6 px-6 py-8 snap-x snap-mandatory touch-pan-x"
          >
            {preferences.map((pref) => (
              <button 
                key={pref.name} 
                onClick={() => setActivePreference(pref.name)}
                className="flex-shrink-0 flex flex-col items-center snap-start group focus:outline-none"
              >
                <div className={`w-[80px] h-[80px] ${pref.color} rounded-[30px] flex items-center justify-center text-4xl shadow-sm mb-4 transition-all duration-400 transform 
                  ${activePreference === pref.name ? `ring-[6px] ring-offset-4 ${pref.activeColor} scale-110 shadow-lg` : 'hover:scale-105 active:scale-95 opacity-80'}`}>
                  {pref.icon}
                </div>
                <span className={`text-[13px] font-black whitespace-nowrap transition-colors ${activePreference === pref.name ? 'text-gray-900 translate-y-1' : 'text-gray-400'}`}>
                  {pref.name}
                </span>
              </button>
            ))}
            <div className="flex-shrink-0 w-24 h-1"></div>
          </div>
        </div>
      </div>

      {/* Recommended Recipes Grid */}
      <div className="mt-6 px-5 mb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900">추천 레시피</h3>
            <p className="text-[11px] text-gray-400 font-bold mt-1 inline-block bg-gray-50 px-3 py-1 rounded-lg">
              {primaryCondition} • {activePreference} 기반 식단
            </p>
          </div>
          <button className="text-xs font-bold text-primary flex items-center bg-primary/5 px-3 py-2 rounded-xl active:scale-95 transition-transform">
            전체보기 <ChevronRight size={14} className="ml-1" />
          </button>
        </div>

        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="flex flex-col relative group cursor-pointer animate-fadeIn">
                <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-md mb-5">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  <button className="absolute top-5 right-5 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-gray-300 hover:text-rose-500 active:scale-90 transition-all">
                    <Heart size={20} />
                  </button>
                </div>
                
                <h4 className="font-black text-[16px] text-gray-900 mb-3 px-1 truncate leading-tight group-hover:text-primary transition-colors">
                  {recipe.title}
                </h4>
                <div className="flex items-center space-x-4 px-1">
                  <div className="flex items-center text-[12px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl">
                    <Flame size={14} className="mr-1.5" />
                    <span>{recipe.calories} kcal</span>
                  </div>
                  <div className="flex items-center text-[12px] font-black text-gray-400">
                    <Clock size={14} className="mr-1.5" />
                    <span>{recipe.time}분</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
            <span className="text-5xl mb-5 opacity-40">🍱</span>
            <p className="text-base font-bold text-gray-400 leading-relaxed">선택하신 '{activePreference}' 선호도에 맞는<br/>레시피를 준비하고 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDiet;
