import React, { useState, useMemo } from 'react';
import { User, Settings, Bell, ChevronRight, Activity, TrendingUp, Calendar, ClipboardCheck, LogOut, Moon, Sun } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';
import DiagnosisResultView from './DiagnosisResultView';
import SettingsView from './SettingsView';
import { useTheme } from '@/contexts/ThemeContext';

interface MyPageProps {
  diagnosisData: DiagnosisResult | null;
  onLogout: () => void;
  onDiagnosisUpdate?: () => void;
  initialShowReport?: boolean;
}

const MyPage: React.FC<MyPageProps> = ({ diagnosisData, onLogout, onDiagnosisUpdate, initialShowReport = false }) => {
  const [showFullReport, setShowFullReport] = useState(initialShowReport);
  const [showSettings, setShowSettings] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // 관리 기간 계산 (가입일로부터 오늘까지)
  const managementDays = useMemo(() => {
    if (!diagnosisData?.joinedAt) {
      // joinedAt이 없으면 localStorage에서 확인 또는 1일 반환
      const savedData = localStorage.getItem('caremeal_diagnosis_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.joinedAt) {
            const joinedDate = new Date(parsed.joinedAt);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - joinedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(1, diffDays); // 최소 1일
          }
        } catch (e) {}
      }
      return 1;
    }
    const joinedDate = new Date(diagnosisData.joinedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // 최소 1일
  }, [diagnosisData?.joinedAt]);

  if (showFullReport && diagnosisData) {
    return <DiagnosisResultView
      data={diagnosisData}
      onClose={() => setShowFullReport(false)}
      onRetry={() => { }}
      onUpdate={onDiagnosisUpdate}
    />;
  }

  if (showSettings) {
    return <SettingsView onBack={() => setShowSettings(false)} />;
  }

  const stats = [
    { label: 'EAT SCORE', value: diagnosisData?.habitScore || '0', unit: '점', icon: <Activity className="text-primary" /> },
    { label: '체질량지수', value: diagnosisData?.bmi || '0', unit: 'BMI', icon: <TrendingUp className="text-blue-500" /> },
    { label: '관리 기간', value: managementDays, unit: '일', icon: <Calendar className="text-yellow-500" /> },
  ];

  return (
    <div className={`flex flex-col h-full pb-32 overflow-y-auto no-scrollbar relative transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-[#f8fafc]'}`}>
      {/* Profile Header */}
      <div className={`px-5 pt-8 pb-10 rounded-b-[40px] shadow-sm transition-colors ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-white'}`}>
              <User size={32} className="text-gray-400" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{diagnosisData?.name || '환자'}님</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{diagnosisData?.name === '김테스트' ? '테스트 계정 모드' : 'CareMeal 프리미엄 회원'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded-full active:scale-90 transition-transform hover:text-primary ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-400'}`}
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, idx) => (
            <div key={idx} className={`p-4 rounded-2xl text-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{s.label}</p>
              <div className="flex items-baseline justify-center mt-1">
                <span className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{s.value}</span>
                <span className={`text-[10px] ml-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <h3 className={`text-xs font-black ml-1 mb-3 uppercase tracking-wider opacity-60 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>나의 리포트</h3>
          <button
            onClick={() => setShowFullReport(true)}
            className={`w-full p-5 rounded-[28px] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <ClipboardCheck size={20} />
              </div>
              <div className="text-left">
                <span className={`font-bold block text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>영양 정밀 진단 리포트</span>
                <span className="text-[10px] text-gray-400">분석된 나의 상세 건강 데이터</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>

        <div>
          <h3 className={`text-xs font-black ml-1 mb-3 uppercase tracking-wider opacity-60 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>계정 및 설정</h3>
          <div className="space-y-3">
            {/* 다크모드 토글 */}
            <div
              onClick={toggleTheme}
              className={`p-5 rounded-[24px] flex items-center justify-between shadow-sm border cursor-pointer transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 active:bg-gray-700' : 'bg-white border-gray-100 active:bg-gray-50'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-indigo-50 text-indigo-500'}`}>
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <div>
                  <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    {theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    {theme === 'dark' ? '밝은 화면으로 변경합니다' : '어두운 화면으로 변경합니다'}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            <div
              onClick={() => setShowSettings(true)}
              className={`p-5 rounded-[24px] flex items-center justify-between shadow-sm border cursor-pointer transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 active:bg-gray-700' : 'bg-white border-gray-100 active:bg-gray-50'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                  <Bell size={20} />
                </div>
                <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>알림 및 안내 설정</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </div>

            <div className="pt-4 pb-12">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onLogout();
                }}
                className={`w-full py-5 flex items-center justify-center space-x-2 text-[15px] font-black rounded-[28px] active:scale-95 transition-all touch-manipulation shadow-sm ${theme === 'dark' ? 'text-rose-400 bg-rose-500/10 border-2 border-rose-500/30' : 'text-rose-500 bg-rose-50/30 border-2 border-rose-100'}`}
              >
                <LogOut size={20} />
                <span>로그아웃 (테스트 종료)</span>
              </button>
              <p className={`text-center text-[10px] mt-6 font-bold tracking-widest uppercase ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>
                CareMeal Engine v1.0.7
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
