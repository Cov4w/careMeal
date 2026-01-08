
import React, { useState } from 'react';
import { User, Settings, Bell, ChevronRight, Activity, TrendingUp, Calendar, ClipboardCheck, LogOut } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';
import DiagnosisResultView from './DiagnosisResultView';

interface MyPageProps {
  diagnosisData: DiagnosisResult | null;
  onLogout: () => void;
}

const MyPage: React.FC<MyPageProps> = ({ diagnosisData, onLogout }) => {
  const [showFullReport, setShowFullReport] = useState(false);

  if (showFullReport && diagnosisData) {
    return <DiagnosisResultView data={diagnosisData} onClose={() => setShowFullReport(false)} onRetry={() => {}} />;
  }

  const stats = [
    { label: 'EAT SCORE', value: diagnosisData?.habitScore || '0', unit: '점', icon: <Activity className="text-primary" /> },
    { label: '체질량지수', value: diagnosisData?.bmi || '0', unit: 'BMI', icon: <TrendingUp className="text-blue-500" /> },
    { label: '관리 기간', value: '1', unit: '일', icon: <Calendar className="text-yellow-500" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] pb-32 overflow-y-auto no-scrollbar relative">
      {/* Profile Header */}
      <div className="bg-white px-5 pt-8 pb-10 rounded-b-[40px] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
              <User size={32} className="text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{diagnosisData?.name || '환자'}님</h2>
              <p className="text-sm text-gray-500">{diagnosisData?.name === '김테스트' ? '테스트 계정 모드' : 'CareMeal 프리미엄 회원'}</p>
            </div>
          </div>
          <button className="p-2 bg-gray-50 rounded-full text-gray-400 active:scale-90 transition-transform hover:text-primary">
            <Settings size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-2xl text-center">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{s.label}</p>
              <div className="flex items-baseline justify-center mt-1">
                <span className="text-lg font-black text-gray-900">{s.value}</span>
                <span className="text-[10px] text-gray-500 ml-0.5">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <h3 className="text-xs font-black text-gray-400 ml-1 mb-3 uppercase tracking-wider opacity-60">나의 리포트</h3>
          <button 
            onClick={() => setShowFullReport(true)}
            className="w-full bg-white p-5 rounded-[28px] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <ClipboardCheck size={20} />
              </div>
              <div className="text-left">
                <span className="font-bold text-gray-800 block text-sm">영양 정밀 진단 리포트</span>
                <span className="text-[10px] text-gray-400">분석된 나의 상세 건강 데이터</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>

        <div>
          <h3 className="text-xs font-black text-gray-400 ml-1 mb-3 uppercase tracking-wider opacity-60">계정 및 설정</h3>
          <div className="space-y-3">
            <div className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                  <Bell size={20} />
                </div>
                <span className="font-bold text-gray-800 text-sm">알림 및 안내 설정</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
            
            {/* Logout Button: 최하단에 확실하게 배치하고 터치 영역 확보 */}
            <div className="pt-4 pb-12">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  // 딜레이 없이 즉시 실행
                  onLogout();
                }} 
                className="w-full py-5 flex items-center justify-center space-x-2 text-[15px] font-black text-rose-500 bg-rose-50/30 border-2 border-rose-100 rounded-[28px] active:scale-95 active:bg-rose-100/50 transition-all touch-manipulation shadow-sm"
              >
                <LogOut size={20} />
                <span>로그아웃 (테스트 종료)</span>
              </button>
              <p className="text-center text-[10px] text-gray-300 mt-6 font-bold tracking-widest uppercase">
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
