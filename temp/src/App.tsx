
import React, { useState, useEffect } from 'react';
import Home from '@/components/Home';
import ChatInterface from '@/components/ChatInterface';
import MealRecord from '@/components/MealRecord';
import CustomDiet from '@/components/CustomDiet';
import MyPage from '@/components/MyPage';
import BottomNav from '@/components/BottomNav';
import Login from '@/components/Login';
import { DiagnosisResult } from '@/components/Diagnosis';
import { DailyMealPlan, MealItem } from './types';

export type ViewState = 'home' | 'chat' | 'mealRecord' | 'customDiet' | 'mypage';

export interface BloodSugarEntry {
  fasting?: number;
  postBreakfast?: number;
  postLunch?: number;
  postDinner?: number;
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('caremeal_logged_in') === 'true';
  });

  const [currentView, setCurrentView] = useState<ViewState>('home');

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

  const handleUpdateMeal = (date: string, time: 'breakfast' | 'lunch' | 'dinner', item: MealItem) => {
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
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setDiagnosisData(null);
    setSelectedConditions([]);
    setInitialChatMessage('');
    setCurrentView('home');
    localStorage.clear();
  };

  const handleOpenChat = (message?: string) => {
    if (message) setInitialChatMessage(message);
    else setInitialChatMessage('');
    setCurrentView('chat');
  };

  const handleTabChange = (view: ViewState) => {
    setInitialChatMessage('');
    setCurrentView(view);
  };

  if (!isLoggedIn) {
    return <Login onLoginComplete={handleLogin} />;
  }

  return (
    <div className="h-[100dvh] w-full bg-white max-w-md mx-auto shadow-none sm:shadow-2xl overflow-hidden relative flex flex-col font-sans">
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
            onBack={() => setCurrentView('home')}
            initialMessage={initialChatMessage}
            userId={diagnosisData?.userId || 'guest'}
            onNavigate={(view) => setCurrentView(view)}
            onSaveMeal={(time, item) => {
              const today = new Date().toISOString().split('T')[0];
              handleUpdateMeal(today, time, item);
              alert(`${time === 'breakfast' ? '아침' : time === 'lunch' ? '점심' : '저녁'} 식단에 추가되었습니다!`);
            }}
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

        {currentView === 'customDiet' && (
          <CustomDiet
            diagnosisData={diagnosisData}
            selectedConditions={selectedConditions}
          />
        )}

        {currentView === 'mypage' && <MyPage diagnosisData={diagnosisData} onLogout={handleLogout} />}
      </div>

      {currentView !== 'chat' && (
        <BottomNav activeTab={currentView as any} onTabChange={handleTabChange} />
      )}
    </div>
  );
};

export default App;
