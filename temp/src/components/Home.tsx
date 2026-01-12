
import React, { useMemo } from 'react';
import { ChevronRight, Send, Sparkles, Activity, PieChart, Apple, Droplet, TrendingUp } from 'lucide-react';
import { DiagnosisResult } from './Diagnosis';
import { BloodSugarEntry } from '@/App';

interface HomeProps {
  diagnosisData: DiagnosisResult | null;
  bloodSugarHistory: Record<string, BloodSugarEntry>;
  onOpenChat: (message?: string) => void;
  onTabChange: (tab: any) => void;
}

const Home: React.FC<HomeProps> = ({ diagnosisData, bloodSugarHistory, onOpenChat, onTabChange }) => {
  const [quickChatMessage, setQuickChatMessage] = React.useState('');

  const handleQuickChatSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickChatMessage.trim()) return;
    onOpenChat(quickChatMessage);
  };

  const isDiabetic = diagnosisData?.conditions?.includes('당뇨병');

  // 최근 7일간의 혈당 데이터 추출 및 그래프 경로 생성
  const trendData = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = bloodSugarHistory[dateStr];
      
      // 공복 혈당 우선, 없으면 평균
      let val = 0;
      if (entry) {
        const vals = [entry.fasting, entry.postBreakfast, entry.postLunch, entry.postDinner].filter(v => v !== undefined) as number[];
        val = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
      dates.push({ date: dateStr, value: val });
    }
    return dates;
  }, [bloodSugarHistory]);

  const chartPath = useMemo(() => {
    if (trendData.every(d => d.value === 0)) return "";
    const width = 300;
    const height = 100;
    const maxVal = Math.max(...trendData.map(d => d.value), 200);
    const minVal = Math.min(...trendData.map(d => d.value).filter(v => v > 0), 70);
    const range = maxVal - minVal || 1;

    return trendData.map((d, i) => {
      const x = (i / 6) * width;
      const y = d.value === 0 ? height : height - ((d.value - minVal) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [trendData]);

  const latestSugar = useMemo(() => {
    const sortedDates = Object.keys(bloodSugarHistory).sort().reverse();
    if (sortedDates.length === 0) return null;
    const entry = bloodSugarHistory[sortedDates[0]];
    return entry.fasting || entry.postBreakfast || entry.postLunch || entry.postDinner;
  }, [bloodSugarHistory]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] pb-32 overflow-y-auto no-scrollbar relative">
      <header className="px-5 pb-5 pt-[calc(env(safe-area-inset-top,12px)+12px)] flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <span className="text-2xl font-black tracking-tighter text-gray-900">CareMeal</span>
      </header>

      {/* Chatbot Input - Moved to Top */}
      <div className="px-5 mt-4 mb-4">
        <form onSubmit={handleQuickChatSend} className="w-full h-14 border border-primary/30 rounded-full flex items-center px-4 justify-between bg-white shadow-sm border-2 focus-within:border-primary transition-all">
          <input 
            type="text"
            value={quickChatMessage}
            onChange={(e) => setQuickChatMessage(e.target.value)}
            placeholder="혈당 관리가 궁금할 땐 김닥터에게!"
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 font-medium px-2"
          />
          <button type="submit" disabled={!quickChatMessage.trim()} className={`p-2 rounded-full ${quickChatMessage.trim() ? 'text-primary' : 'text-gray-300'}`}>
            <Send size={22} />
          </button>
        </form>
      </div>

      {/* Hero Welcome Section */}
      <div className="px-5 mb-6">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-1">
            {diagnosisData?.name || '환자'}님, 안녕하세요! 👨‍⚕️
          </h2>
          <p className="text-sm text-gray-400">오늘도 건강한 식사 하셨나요?</p>
          
          <div className="mt-6 flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                <PieChart size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase">오늘의 EAT SCORE</p>
                <p className="text-lg font-black text-gray-900">{diagnosisData?.habitScore || 0}점</p>
              </div>
            </div>
            <button onClick={() => onTabChange('mypage')} className="text-xs font-bold text-primary flex items-center">리포트 보기 <ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      {/* Diabetic Special: Blood Sugar Trend */}
      {isDiabetic && (
        <div className="px-5 mb-8">
          <div className="bg-gray-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Activity size={80} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center">
                  <Droplet size={18} />
                </div>
                <h3 className="font-black text-lg">혈당 변화 추이</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/40 font-bold uppercase">최근 기록</p>
                <p className="text-sm font-black text-rose-400">{latestSugar ? `${latestSugar} mg/dL` : '기록 없음'}</p>
              </div>
            </div>

            <div className="relative h-24 w-full mb-4 px-2">
              {chartPath ? (
                <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
                  <path 
                    d={chartPath} 
                    fill="none" 
                    stroke="rgba(244, 63, 94, 0.8)" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="animate-fadeIn"
                  />
                  {trendData.map((d, i) => d.value > 0 && (
                    <circle 
                      key={i} 
                      cx={(i / 6) * 300} 
                      cy={100 - ((d.value - Math.min(...trendData.map(v => v.value).filter(x => x > 0))) / (Math.max(...trendData.map(v => v.value), 200) - Math.min(...trendData.map(v => v.value).filter(x => x > 0)) || 1)) * 100} 
                      r="4" 
                      fill="#f43f5e" 
                    />
                  ))}
                </svg>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/20">
                  <TrendingUp size={32} />
                  <p className="text-[10px] mt-1">데이터를 입력하면 그래프가 생성됩니다</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-between text-[10px] font-bold text-white/30 px-1">
              <span>7일 전</span>
              <span>오늘</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Feature Grid */}
      <div className="px-5 grid grid-cols-2 gap-4 mb-8">
        <button onClick={() => onTabChange('mealRecord')} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-2 active:scale-95 transition-transform">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
            <Apple size={24} />
          </div>
          <span className="text-sm font-bold text-gray-800">식단 & 혈당 기록</span>
        </button>
        <button onClick={() => onTabChange('customDiet')} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-2 active:scale-95 transition-transform">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <span className="text-sm font-bold text-gray-800">맞춤 식단 보기</span>
        </button>
      </div>

      {/* Health Stats */}
      <div className="px-5 mb-8">
        <h3 className="text-lg font-black text-gray-900 mb-4 px-1">최근 건강 지표</h3>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity size={18} className="text-rose-500" />
              <span className="text-sm font-bold text-gray-600">체질량 지수 (BMI)</span>
            </div>
            <span className="text-sm font-black text-gray-900">{diagnosisData?.bmi || '-'}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles size={18} className="text-yellow-500" />
              <span className="text-sm font-bold text-gray-600">집중 관리 질환</span>
            </div>
            <span className="text-sm font-black text-gray-900">{diagnosisData?.conditions?.[0] || '없음'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
