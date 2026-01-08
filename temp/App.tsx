
import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import ChatInterface from './components/ChatInterface';
import MealRecord from './components/MealRecord';
import CustomDiet from './components/CustomDiet';
import MyPage from './components/MyPage';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import { DiagnosisResult } from './components/Diagnosis';

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
          />
        )}

        {currentView === 'mealRecord' && (
          <MealRecord
            bloodSugarHistory={bloodSugarHistory}
            onUpdateBloodSugar={(date, data) => setBloodSugarHistory(prev => ({ ...prev, [date]: data }))}
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
