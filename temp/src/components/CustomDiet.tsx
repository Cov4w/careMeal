
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Heart, Clock, Flame, ChevronRight, ChevronLeft, Sparkles, Loader2, Moon, Sun } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';
import { fetchRecommendedRecipes, Recipe, saveUserPreference } from '../services/api';
import { useTheme } from '@/contexts/ThemeContext';

interface CustomDietProps {
  diagnosisData: DiagnosisResult | null;
  selectedConditions: string[];
  onRecipeClick?: (recipe: Recipe) => void; // [New]
}

const CustomDiet: React.FC<CustomDietProps> = ({ diagnosisData, onRecipeClick }) => {
  const { theme, toggleTheme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  // State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userConditions, setUserConditions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePreference, setActivePreference] = useState(''); // 기본값: 전체보기

  // Load Data from API
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      // 로컬스토리지 키가 'userId'일 수도 있고 'user_id'일 수도 있으므로 둘 다 체크
      const storedUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');
      if (!storedUserId) {
        console.warn("No logged-in user found. Skipping recipe fetch.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchRecommendedRecipes(storedUserId);
        setRecipes(data.recommendations || []); // 안전하게 빈 배열 처리

        if (data.user_condition) {
          setUserConditions(data.user_condition.split(',').map(s => s.trim()));
        }
      } catch (e) {
        console.error("Recipe Fetch Error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [diagnosisData]);

  // Filtering Logic (프론트엔드에서는 '식단 타입'으로 필터링)
  // activePreference가 '고기', '해산물' 등임. API 데이터의 diet_type과 매칭
  const filteredRecipes = useMemo(() => {
    let result = recipes;
    if (activePreference === 'liked') {
      result = result.filter(r => r.is_liked);
    } else if (activePreference) {
      result = result.filter(r => r.diet_type === activePreference || r.category === activePreference);
    }
    return result;
  }, [recipes, activePreference]);

  // [New] 좋아요 토글
  const handleLikeToggle = async (e: React.MouseEvent, recipeId: number) => {
    e.stopPropagation(); // 카드 클릭 방지

    // 낙관적 업데이트
    setRecipes(prev => prev.map(r =>
      r.id === recipeId ? { ...r, is_liked: !r.is_liked } : r
    ));

    const userId = localStorage.getItem('userId') || 'guest';
    // 현재 상태의 반대를 보내야 함 (safe way: find recipe first)
    const target = recipes.find(r => r.id === recipeId);
    if (target) {
      saveUserPreference(userId, recipeId, target.is_liked ? 'dislike' : 'like');
    }
  };

  const preferences = [
    { name: '고기', icon: '🥩', color: 'bg-rose-50', activeColor: 'ring-rose-500 bg-rose-100' },
    { name: '해산물', icon: '🐟', color: 'bg-blue-50', activeColor: 'ring-blue-500 bg-blue-100' },
    { name: '가금류', icon: '🐔', color: 'bg-orange-50', activeColor: 'ring-orange-500 bg-orange-100' },
    { name: '채식(비건)', icon: '🥗', color: 'bg-emerald-50', activeColor: 'ring-emerald-500 bg-emerald-100' },
    { name: '고단백', icon: '💪', color: 'bg-indigo-50', activeColor: 'ring-indigo-500 bg-indigo-100' },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollAmount = 240;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full pb-24 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-gray-400 font-bold">맞춤 식단을 분석 중입니다...</p>
      </div>
    );
  }

  // 화면 표시용 메인 컨디션 (첫 번째 것 사용)
  const displayCondition = userConditions.length > 0 ? userConditions[0] : '건강';
  const fullConditionText = userConditions.join(', ');

  return (
    <div className={`flex flex-col h-full pb-24 overflow-y-auto no-scrollbar relative font-sans transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <header className={`px-5 py-6 flex items-center justify-between sticky top-0 backdrop-blur-sm z-30 border-b ${theme === 'dark' ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-50'}`}>
        <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {fullConditionText} 맞춤 식단
        </h1>
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-full transition-all active:scale-90 ${theme === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Dietary Preferences Section */}
      <div className="mt-8 relative">
        <div className="px-5 flex items-center justify-between mb-4">
          <h3 className={`text-lg font-black flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            식이 선호도 <Sparkles size={16} className="ml-2 text-primary/60" />
          </h3>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => scroll('left')}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:bg-primary/10 hover:text-primary border shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll('right')}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:bg-primary/10 hover:text-primary border shadow-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="relative overflow-visible">
          <div className={`absolute inset-y-0 left-0 w-6 bg-gradient-to-r z-10 pointer-events-none ${theme === 'dark' ? 'from-gray-900 via-gray-900/50 to-transparent' : 'from-white via-white/50 to-transparent'}`} />
          <div className={`absolute inset-y-0 right-0 w-6 bg-gradient-to-l z-10 pointer-events-none ${theme === 'dark' ? 'from-gray-900 via-gray-900/50 to-transparent' : 'from-white via-white/50 to-transparent'}`} />

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
            <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>추천 레시피</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {userConditions.map(cond => (
                <span key={cond} className={`text-[11px] font-bold px-2 py-1 rounded-md ${theme === 'dark' ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-gray-100'}`}>
                  #{cond}
                </span>
              ))}
              {activePreference && (
                <span className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-1 rounded-md">
                  #{activePreference}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActivePreference(activePreference === 'liked' ? '' : 'liked')}
              className={`text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center ${activePreference === 'liked'
                ? 'bg-rose-100 text-rose-500 shadow-sm'
                : theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-rose-500/20 hover:text-rose-400' : 'bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-400'
                }`}
            >
              <Heart size={14} className={`mr-1 ${activePreference === 'liked' ? 'fill-current' : ''}`} /> 찜한 메뉴
            </button>
            <button
              onClick={() => setActivePreference('')}
              className="text-xs font-bold text-primary flex items-center bg-primary/5 px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              전체보기 <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
        </div>

        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex flex-col relative group cursor-pointer animate-fadeIn"
                onClick={() => onRecipeClick?.(recipe)} // [New]
              >
                <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-md mb-5 bg-gray-100">
                  <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  <button
                    onClick={(e) => handleLikeToggle(e, recipe.id)}
                    className={`absolute top-5 right-5 p-2.5 backdrop-blur-sm rounded-full shadow-lg transition-all active:scale-90 ${recipe.is_liked
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/90 text-gray-300 hover:text-rose-500'
                      }`}
                  >
                    <Heart size={20} fill={recipe.is_liked ? "currentColor" : "none"} />
                  </button>
                  {/* 나트륨 경고 뱃지 (예시) */}
                  {/* recipe.sodium이 일정 수준 이상이면 경고 표시를 할 수도 있음 */}
                </div>

                <h4 className={`font-black text-[16px] mb-3 px-1 truncate leading-tight group-hover:text-primary transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {recipe.name}
                </h4>
                <div className="flex items-center space-x-4 px-1">
                  <div className="flex items-center text-[12px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl">
                    <Flame size={14} className="mr-1.5" />
                    <span>{recipe.calories} kcal</span>
                  </div>
                  <div className="flex items-center text-[12px] font-black text-gray-400">
                    <Clock size={14} className="mr-1.5" />
                    <span>{recipe.time_minutes}분</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
            <span className="text-5xl mb-5 opacity-40">🍱</span>
            <p className="text-base font-bold text-gray-400 leading-relaxed">
              '{displayCondition}' 상태에서<br />
              '{activePreference}' 타입의 레시피를<br />
              찾지 못했습니다. 😢
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDiet;
