import React from 'react';
import { ChevronLeft, Clock, Flame, Utensils, ShoppingBag, ThumbsUp, ThumbsDown, Heart } from 'lucide-react';
import { Recipe, saveUserPreference } from '../services/api';

interface RecipeDetailProps {
    recipe: Recipe;
    userId: string; // [New]
    onBack: () => void;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, userId, onBack }) => {
    // [Init] 초기 상태를 prop에서 가져옴 ('like' or null)
    const [feedback, setFeedback] = React.useState<'like' | 'dislike' | null>(
        recipe.is_liked ? 'like' : null
    );

    const handleFeedback = (type: 'like' | 'dislike') => {
        setFeedback(type);
        saveUserPreference(userId, recipe.id, type);
    };
    // 탄단지 비율 계산 (도넛 차트용)
    const total = recipe.carbs + recipe.protein + recipe.fat;
    const carbsPct = total ? (recipe.carbs / total) * 100 : 0;
    const proteinPct = total ? (recipe.protein / total) * 100 : 0;
    const fatPct = total ? (recipe.fat / total) * 100 : 0;

    // 도넛 차트용 CSS conic-gradient 생성
    const donutGradient = `conic-gradient(
    #60A5FA 0% ${carbsPct}%, 
    #34D399 ${carbsPct}% ${carbsPct + proteinPct}%, 
    #F87171 ${carbsPct + proteinPct}% 100%
  )`;

    return (
        <div className="h-full flex flex-col bg-white overflow-y-auto pb-20 animate-fadeIn">
            {/* 1. 상단 이미지 영역 */}
            <div className="relative w-full h-72 shrink-0">
                <img
                    src={recipe.image_url}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
                    }}
                />
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/50 to-transparent" />
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className="flex-1 px-6 -mt-6 relative z-10 bg-white rounded-t-[30px] pt-8">
                {/* 2. 헤더 정보 */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                            #{recipe.category}
                        </span>
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                            #{recipe.diet_type || '맞춤식단'}
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">{recipe.name}</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">{recipe.description}</p>

                    <div className="flex items-center gap-6 mt-4 text-gray-500 text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-gray-400" />
                            {recipe.time_minutes || 20}분
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Flame size={16} className="text-orange-400" />
                            {recipe.calories} kcal
                        </div>
                    </div>
                </div>

                {/* 3. 영양 성분 도넛 그래프 */}
                <div className="mb-10 bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5 text-primary" /> 영양 밸런스
                    </h3>

                    <div className="flex items-center justify-between">
                        {/* 도넛 그래프 */}
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <div
                                className="w-full h-full rounded-full"
                                style={{ background: donutGradient }}
                            />
                            <div className="absolute w-24 h-24 bg-gray-50 rounded-full flex flex-col items-center justify-center">
                                <span className="text-xs text-gray-400">총 열량</span>
                                <span className="text-lg font-black text-gray-800">{recipe.calories}</span>
                                <span className="text-[10px] text-gray-400">kcal</span>
                            </div>
                        </div>

                        {/* 범례 */}
                        <div className="space-y-3 flex-1 ml-8">
                            <NutritionRow color="bg-blue-400" label="탄수화물" amount={recipe.carbs} unit="g" />
                            <NutritionRow color="bg-green-400" label="단백질" amount={recipe.protein} unit="g" />
                            <NutritionRow color="bg-red-400" label="지방" amount={recipe.fat} unit="g" />
                        </div>
                    </div>
                </div>

                {/* 3.5 재료 목록 */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" /> 필요 재료
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {recipe.ingredients ? (
                            recipe.ingredients.split(',').map((ing, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
                                >
                                    {ing.trim()}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-sm">등록된 재료 정보가 없습니다.</span>
                        )}
                    </div>
                </div>

                {/* 4. 조리 방법 */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" /> 조리 방법
                    </h3>
                    {recipe.instructions ? (
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                            {recipe.instructions}
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            <p className="text-gray-400 text-sm mb-2">아직 등록된 조리 순서가 없습니다.</p>
                            <p className="text-gray-300 text-xs">레시피 상세 내용을 나중에 직접 입력해주세요.</p>
                        </div>
                    )}
                </div>

                {/* 5. 피드백 섹션 */}
                <div className="mb-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-gray-500 text-sm mb-4">이 메뉴 추천이 마음에 드시나요?</p>
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => handleFeedback('dislike')}
                            className={`flex items-center space-x-2 px-5 py-3 rounded-2xl border transition-all ${feedback === 'dislike'
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <ThumbsDown size={18} />
                            <span className="text-sm font-bold">별로예요</span>
                        </button>
                        <button
                            onClick={() => handleFeedback('like')}
                            className={`flex items-center space-x-2 px-5 py-3 rounded-2xl border transition-all ${feedback === 'like'
                                ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-200'
                                : 'bg-white text-rose-500 border-rose-100 hover:bg-rose-50'
                                }`}
                        >
                            <Heart size={18} fill={feedback === 'like' ? "currentColor" : "none"} />
                            <span className="text-sm font-bold">좋아요!</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 서브 컴포넌트: 영양소 행
const NutritionRow = ({ color, label, amount, unit }: any) => (
    <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-gray-600 font-medium">{label}</span>
        </div>
        <span className="font-bold text-gray-900">{amount}{unit}</span>
    </div>
);

// 임시 아이콘 컴포넌트 (Activity는 겹칠 수 있어서 별도 정의)
const ActivityIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export default RecipeDetail;
