
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



  // 최근 7일간의 혈당 데이터 추출 (4가지 타입 모두 포함)
  const trendData = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = bloodSugarHistory[dateStr];

      dates.push({
        date: dateStr,
        day: d.getDate(),
        fasting: entry?.fasting || 0,
        postBreakfast: entry?.postBreakfast || 0,
        postLunch: entry?.postLunch || 0,
        postDinner: entry?.postDinner || 0,
      });
    }
    return dates;
  }, [bloodSugarHistory]);

  // 혈당 타입별 색상 정의
  const bloodSugarColors = {
    fasting: '#ec4899',      // 공복 - 핑크
    postBreakfast: '#f59e0b', // 아침 - 노랑
    postLunch: '#0ea5e9',     // 점심 - 하늘색
    postDinner: '#8b5cf6',    // 저녁 - 보라
  };

  // Y좌표 계산 (동적 스케일)
  const getY = (value: number, height: number, minScale = 40, maxScale = 320) => {
    if (value === 0) return height;
    return height - ((value - minScale) / (maxScale - minScale)) * height;
  };

  const latestSugar = useMemo(() => {
    const sortedDates = Object.keys(bloodSugarHistory).sort().reverse();
    if (sortedDates.length === 0) return null;
    const entry = bloodSugarHistory[sortedDates[0]];
    return entry.postDinner || entry.postLunch || entry.postBreakfast || entry.fasting;
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
            <button onClick={() => onTabChange('mypage')} className="text-xs font-bold text-primary flex items-center">리포트 보기 <ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Diabetic Special: Blood Sugar Trend */}
      {isDiabetic && (
        <div className="px-5 mb-8">
          <div
            className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center">
                  <Droplet size={18} className="text-rose-500" />
                </div>
                <h3 className="font-bold text-gray-900">혈당 변화 추이</h3>
              </div>
            </div>

            {/* 범례 */}
            <div className="flex flex-wrap gap-3 mb-4 text-[10px] font-bold">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bloodSugarColors.fasting }}></span>
                <span className="text-gray-500">공복</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bloodSugarColors.postBreakfast }}></span>
                <span className="text-gray-500">아침</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bloodSugarColors.postLunch }}></span>
                <span className="text-gray-500">점심</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bloodSugarColors.postDinner }}></span>
                <span className="text-gray-500">저녁</span>
              </div>
            </div>

            {/* 그래프 영역 */}
            <div className="flex">
              {/* Y축 라벨 (300, 180, 140, 70, 40) */}
              <div className="flex flex-col justify-between text-[9px] text-gray-400 font-medium pr-2" style={{ height: '220px' }}>
                <span>320</span>
                <span>280</span>
                <span>240</span>
                <span>200</span>
                <span>160</span>
                <span>120</span>
                <span>80</span>
                <span>40</span>
              </div>

              {/* 그래프 */}
              <div className="flex-1 relative" style={{ height: '220px' }}>
                <svg viewBox="0 0 260 220" className="w-full h-full" style={{ overflow: 'visible' }}>
                  {/* 배경 그리드 - 가로선 (8개: 320, 280, 240, 200, 160, 120, 80, 40) */}
                  {[320, 280, 240, 200, 160, 120, 80, 40].map((val, i) => {
                    const y = 220 - ((val - 40) / (320 - 40)) * 220;
                    return <line key={`grid-h-${i}`} x1="10" y1={y} x2="250" y2={y} stroke="#f0f0f0" strokeWidth="1" />;
                  })}
                  {/* 배경 그리드 - 세로선 */}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <line key={`grid-v-${i}`} x1={10 + (i / 6) * 240} y1="0" x2={10 + (i / 6) * 240} y2="220" stroke="#f0f0f0" strokeWidth="1" />
                  ))}

                  {/* 공복 혈당 라인 */}
                  {trendData.filter(d => d.fasting > 0).length > 1 && (
                    <path
                      d={trendData.map((d, i) => {
                        if (d.fasting === 0) return '';
                        const x = 10 + (i / 6) * 240;
                        const y = getY(d.fasting, 220);
                        const prevValid = trendData.slice(0, i).filter(p => p.fasting > 0);
                        return prevValid.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={bloodSugarColors.fasting}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* 아침 식후 라인 */}
                  {trendData.filter(d => d.postBreakfast > 0).length > 1 && (
                    <path
                      d={trendData.map((d, i) => {
                        if (d.postBreakfast === 0) return '';
                        const x = 10 + (i / 6) * 240;
                        const y = getY(d.postBreakfast, 220);
                        const prevValid = trendData.slice(0, i).filter(p => p.postBreakfast > 0);
                        return prevValid.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={bloodSugarColors.postBreakfast}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* 점심 식후 라인 */}
                  {trendData.filter(d => d.postLunch > 0).length > 1 && (
                    <path
                      d={trendData.map((d, i) => {
                        if (d.postLunch === 0) return '';
                        const x = 10 + (i / 6) * 240;
                        const y = getY(d.postLunch, 220);
                        const prevValid = trendData.slice(0, i).filter(p => p.postLunch > 0);
                        return prevValid.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={bloodSugarColors.postLunch}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* 저녁 식후 라인 */}
                  {trendData.filter(d => d.postDinner > 0).length > 1 && (
                    <path
                      d={trendData.map((d, i) => {
                        if (d.postDinner === 0) return '';
                        const x = 10 + (i / 6) * 240;
                        const y = getY(d.postDinner, 220);
                        const prevValid = trendData.slice(0, i).filter(p => p.postDinner > 0);
                        return prevValid.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={bloodSugarColors.postDinner}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* 데이터 포인트들 */}
                  {trendData.map((d, i) => (
                    <React.Fragment key={i}>
                      {d.fasting > 0 && (
                        <>
                          <circle cx={10 + (i / 6) * 240} cy={getY(d.fasting, 220)} r="4" fill={bloodSugarColors.fasting} />
                          {i === 6 && <text x={10 + (i / 6) * 240 + 8} y={getY(d.fasting, 220) + 3} textAnchor="start" fontSize="8" fill={bloodSugarColors.fasting} fontWeight="bold">{d.fasting}</text>}
                        </>
                      )}
                      {d.postBreakfast > 0 && (
                        <>
                          <circle cx={10 + (i / 6) * 240} cy={getY(d.postBreakfast, 220)} r="4" fill={bloodSugarColors.postBreakfast} />
                          {i === 6 && <text x={10 + (i / 6) * 240 + 8} y={getY(d.postBreakfast, 220) + 3} textAnchor="start" fontSize="8" fill={bloodSugarColors.postBreakfast} fontWeight="bold">{d.postBreakfast}</text>}
                        </>
                      )}
                      {d.postLunch > 0 && (
                        <>
                          <circle cx={10 + (i / 6) * 240} cy={getY(d.postLunch, 220)} r="4" fill={bloodSugarColors.postLunch} />
                          {i === 6 && <text x={10 + (i / 6) * 240 + 8} y={getY(d.postLunch, 220) + 3} textAnchor="start" fontSize="8" fill={bloodSugarColors.postLunch} fontWeight="bold">{d.postLunch}</text>}
                        </>
                      )}
                      {d.postDinner > 0 && (
                        <>
                          <circle cx={10 + (i / 6) * 240} cy={getY(d.postDinner, 220)} r="4" fill={bloodSugarColors.postDinner} />
                          {i === 6 && <text x={10 + (i / 6) * 240 + 8} y={getY(d.postDinner, 220) + 3} textAnchor="start" fontSize="8" fill={bloodSugarColors.postDinner} fontWeight="bold">{d.postDinner}</text>}
                        </>
                      )}
                    </React.Fragment>
                  ))}

                  {/* X축 날짜 라벨 */}
                  {trendData.map((d, i) => (
                    <text
                      key={`label-${i}`}
                      x={10 + (i / 6) * 240}
                      y="235"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#9ca3af"
                      fontWeight="500"
                    >
                      {d.day}일
                    </text>
                  ))}
                </svg>

                {/* 데이터가 없을 때 */}
                {trendData.every(d => d.fasting === 0 && d.postBreakfast === 0 && d.postLunch === 0 && d.postDinner === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                    <TrendingUp size={32} />
                    <p className="text-[10px] mt-1">데이터를 입력하면 그래프가 생성됩니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 혈당 그래프 모달 */}


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
