import React, { useState, useEffect, useCallback } from 'react';
import Home from '@/components/Home';
import ChatInterface from '@/components/ChatInterface';
import MealRecord from '@/components/MealRecord';
import CustomDiet from '@/components/CustomDiet';
import MyPage from '@/components/MyPage';
import BottomNav from '@/components/BottomNav';
import Login from '@/components/Login';
import { DiagnosisResult } from '@/components/Diagnosis';
import { analyzeFoodImage, fetchMealRecord, saveMealRecord, MealRecordData, fetchRecommendedRecipes, clearAccessToken } from '@/services/api';
import { DailyMealPlan, MealItem } from './types';

import RecipeDetail from './components/RecipeDetail';
import { Recipe, API_BASE_URL } from '@/services/api';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

export type ViewState = 'home' | 'chat' | 'mealRecord' | 'customDiet' | 'mypage' | 'mypage-report' | 'recipe-detail' | 'chatbot';

// URL 해시와 뷰 상태 매핑
const VIEW_TO_HASH: Record<ViewState, string> = {
  'home': '',
  'chat': 'chat',
  'mealRecord': 'meal',
  'customDiet': 'diet',
  'mypage': 'mypage',
  'mypage-report': 'report',
  'recipe-detail': 'recipe',
  'chatbot': 'chat',
};

const HASH_TO_VIEW: Record<string, ViewState> = {
  '': 'home',
  'chat': 'chat',
  'meal': 'mealRecord',
  'diet': 'customDiet',
  'mypage': 'mypage',
  'report': 'mypage-report',
  'recipe': 'recipe-detail',
};

export interface BloodSugarEntry {
  fasting?: number;
  postBreakfast?: number;
  postLunch?: number;
  postDinner?: number;
}

// 히스토리 스택 관리
const viewHistory: ViewState[] = [];

const AppContent: React.FC = () => {
  const { theme } = useTheme();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('caremeal_logged_in') === 'true';
  });

  // URL 해시에서 초기 뷰 결정
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const hash = window.location.hash.replace('#', '');
    return HASH_TO_VIEW[hash] || 'home';
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [diagnosisData, setDiagnosisData] = useState<DiagnosisResult | null>(() => {
    const saved = localStorage.getItem('caremeal_diagnosis_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => {
    const saved = localStorage.getItem('caremeal_selected_conditions');
    return saved ? JSON.parse(saved) : [];
  });

  // 혈당 기록 데이터 관리
  const [bloodSugarHistory, setBloodSugarHistory] = useState<Record<string, BloodSugarEntry>>(() => {
    const saved = localStorage.getItem('caremeal_blood_sugar_history');
    return saved ? JSON.parse(saved) : {};
  });

  // [NEW] 식단 기록 데이터 관리 (App Level로 승격)
  const [mealData, setMealData] = useState<Record<string, DailyMealPlan>>(() => {
    const saved = localStorage.getItem('caremeal_meal_plan_v2'); // v2로 변경 (구조 바뀜)
    return saved ? JSON.parse(saved) : {};
  });

  const [initialChatMessage, setInitialChatMessage] = useState<string>('');

  useEffect(() => {
    if (isLoggedIn && diagnosisData) {
      localStorage.setItem('caremeal_logged_in', 'true');
      localStorage.setItem('caremeal_diagnosis_data', JSON.stringify(diagnosisData));
      localStorage.setItem('caremeal_selected_conditions', JSON.stringify(diagnosisData.conditions));
      setSelectedConditions(diagnosisData.conditions);
    }
  }, [isLoggedIn, diagnosisData]);

  useEffect(() => {
    localStorage.setItem('caremeal_blood_sugar_history', JSON.stringify(bloodSugarHistory));
  }, [bloodSugarHistory]);

  useEffect(() => {
    localStorage.setItem('caremeal_meal_plan_v2', JSON.stringify(mealData));
  }, [mealData]);

  const handleUpdateMeal = (date: string, time: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'lateNightSnack', item: MealItem) => {
    setMealData(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [time]: item
      }
    }));
  };

  const handleSaveMealFromChat = (item: MealItem) => {
    // 오늘 날짜로 저장하되, 시간대는 사용자가 선택하게 함 (ChatInterface에서 처리 예정이지만 App에선 일단 저장 로직만 제공)
    // 여기서는 ChatInterface가 직접 handleUpdateMeal을 호출하는게 나을 수 있음.
    // 하지만 편의상 오늘 날짜 기준 저장 함수를 제공.

    // 이 함수는 "오늘" "특정 끼니"에 저장하는 래퍼
    // 하지만 ChatInterface에서 "끼니"를 선택해야 하므로, 사실상 handleUpdateMeal을 직접 넘기는게 나음.
  };

  const handleLogin = (data: DiagnosisResult) => {
    setDiagnosisData(data);
    setSelectedConditions(data.conditions);
    localStorage.setItem('caremeal_logged_in', 'true');
    localStorage.setItem('caremeal_diagnosis_data', JSON.stringify(data));
    localStorage.setItem('caremeal_selected_conditions', JSON.stringify(data.conditions));

    // [중요] userId 저장 (API 호출용)
    if (data.userId) {
      localStorage.setItem('userId', data.userId);
    } else {
      // userId가 없으면 이름이라도 ID로 사용 (혹은 임시 ID 생성)
      const fallbackId = data.name || "guest_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('userId', fallbackId);
      // data 객체에도 업데이트
      data.userId = fallbackId;
      localStorage.setItem('caremeal_diagnosis_data', JSON.stringify(data));
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setDiagnosisData(null);
    setSelectedConditions([]);
    setInitialChatMessage('');
    navigateTo('home', true);
    clearAccessToken();
    localStorage.clear();
  };

  // 브라우저 히스토리와 연동된 뷰 변경
  const navigateTo = useCallback((view: ViewState, replace = false) => {
    const hash = VIEW_TO_HASH[view];
    const newUrl = hash ? `#${hash}` : window.location.pathname;

    if (replace) {
      window.history.replaceState({ view }, '', newUrl);
    } else {
      window.history.pushState({ view }, '', newUrl);
    }
    setCurrentView(view);
  }, []);

  // 브라우저 뒤로가기/앞으로가기 이벤트 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
      } else {
        const hash = window.location.hash.replace('#', '');
        setCurrentView(HASH_TO_VIEW[hash] || 'home');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 초기 상태 설정
    const initialHash = window.location.hash.replace('#', '');
    const initialView = HASH_TO_VIEW[initialHash] || 'home';
    window.history.replaceState({ view: initialView }, '', window.location.href);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenChat = (message?: string) => {
    if (message) setInitialChatMessage(message);
    else setInitialChatMessage('');
    navigateTo('chat');
  };

  const handleTabChange = (view: ViewState) => {
    setInitialChatMessage('');
    if (view === 'chatbot') {
      navigateTo('chat');
    } else {
      navigateTo(view);
    }
  };

  // [New] 채팅에서 레시피 선택 시 처리
  const handleRecipeSelectFromChat = async (recipeId: number) => {
    const userId = diagnosisData?.userId || 'guest';
    try {
      const data = await fetchRecommendedRecipes(userId);
      const targetRecipe = data.recommendations.find(r => r.id === recipeId);

      if (targetRecipe) {
        setSelectedRecipe(targetRecipe);
        navigateTo('recipe-detail');
      } else {
        alert("해당 레시피 정보를 찾을 수 없습니다.");
      }
    } catch (e) {
      console.error("Failed to fetch recipe detail", e);
      alert("레시피 정보를 불러오는 중 오류가 발생했습니다.");
    }
  };

  // [New] Fetch Latest Diagnosis from Server (Syncing across components)
  const fetchLatestDiagnosis = async () => {
    const userId = diagnosisData?.userId || localStorage.getItem('userId');
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/diagnosis/latest/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.date) { // Only update if valid data exists
          setDiagnosisData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              habitScore: data.eatScore,
              prescriptions: data.prescriptions
            };
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync diagnosis", e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchLatestDiagnosis();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <Login onLoginComplete={handleLogin} />;
  }

  return (
    <div className={`h-[100dvh] w-full max-w-md mx-auto shadow-none sm:shadow-2xl overflow-hidden relative flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex-1 overflow-hidden relative">
            {currentView === 'home' && (
              <Home
                diagnosisData={diagnosisData}
                bloodSugarHistory={bloodSugarHistory}
                onOpenChat={handleOpenChat}
                onTabChange={handleTabChange}
              />
            )}

            {currentView === 'chat' && (
              <ChatInterface
                onBack={() => window.history.back()}
                initialMessage={initialChatMessage}
                userId={diagnosisData?.userId || 'guest'}
                onNavigate={(view) => navigateTo(view)}
                onRecipeSelect={handleRecipeSelectFromChat}
                onSaveMeal={async (time, item) => {
                  const today = new Date().toISOString().split('T')[0];
                  const userId = diagnosisData?.userId || 'guest';

                  // 1. Fetch latest data from server first (Source of Truth)
                  let currentServerData: MealRecordData | null = null;
                  try {
                    currentServerData = await fetchMealRecord(userId, today);
                  } catch (e) {
                    console.warn("Failed to fetch latest records, using local state fallback.");
                  }

                  // Check for overwrite based on server data (or fallback to local)
                  const existingMeal = currentServerData?.meals?.[time] || mealData[today]?.[time];

                  if (existingMeal) {
                    const label = time === 'breakfast' ? '아침' : time === 'lunch' ? '점심' : '저녁';
                    if (!window.confirm(`오늘 ${label} 식단 기록이 이미 존재합니다. 덮어쓰시겠습니까?`)) {
                      return;
                    }
                  }

                  try {
                    // 2. Prepare payload merging with Server Data
                    const recordData: MealRecordData = {
                      user_id: userId,
                      date: today,
                      meals: {
                        ...currentServerData?.meals, // Keep existing server meals
                        [time]: {
                          menu: item.menu,
                          calories: item.nutrition.calories,
                          carbs: item.nutrition.carbs,
                          protein: item.nutrition.protein,
                          fat: item.nutrition.fat
                        }
                      },
                      blood_sugar: currentServerData?.blood_sugar || bloodSugarHistory[today] || {}
                    };

                    // 3. Save to Backend
                    await saveMealRecord(recordData);

                    // 4. Update Local State
                    handleUpdateMeal(today, time, item);
                    alert(`${time === 'breakfast' ? '아침' : time === 'lunch' ? '점심' : '저녁'} 식단이 안전하게 저장되었습니다!`);

                  } catch (e) {
                    console.error("Failed to save from chat", e);
                    alert("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                  }
                }}
              />
            )}

            {currentView === 'customDiet' && (
              <CustomDiet
                diagnosisData={diagnosisData}
                selectedConditions={selectedConditions}
                onRecipeClick={(recipe: Recipe) => {
                  setSelectedRecipe(recipe);
                  navigateTo('recipe-detail');
                }}
              />
            )}

            {currentView === 'recipe-detail' && selectedRecipe && (
              <RecipeDetail
                recipe={selectedRecipe}
                userId={diagnosisData?.userId || 'guest'}
                onBack={() => window.history.back()}
              />
            )}

            {currentView === 'mealRecord' && (
              <MealRecord
                bloodSugarHistory={bloodSugarHistory}
                onUpdateBloodSugar={(date, data) => setBloodSugarHistory(prev => ({ ...prev, [date]: data }))}
                mealData={mealData}
                onUpdateMeal={handleUpdateMeal}
                userId={diagnosisData?.userId || 'guest'}
              />
            )}

            {(currentView === 'mypage' || currentView === 'mypage-report') && (
              <MyPage
                diagnosisData={diagnosisData}
                onLogout={handleLogout}
                onDiagnosisUpdate={fetchLatestDiagnosis}
                initialShowReport={currentView === 'mypage-report'}
              />
            )}
          </div>

      <BottomNav activeTab={currentView === 'chat' ? 'chatbot' : currentView as any} onTabChange={handleTabChange} />
    </div>
  );
};

// App 래퍼 - ThemeProvider로 감싸기
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
