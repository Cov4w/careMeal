import React, { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, Scale, Droplet, Bone, Zap, Heart, Target, Award, ChevronDown, X, AlertCircle, Radio } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  saveBodyComposition,
  fetchLatestBodyComposition,
  fetchBodyCompositionHistory,
  fetchBodyCompositionStats,
  BodyCompositionData,
  BodyCompositionHistoryItem,
  BodyCompositionStatsResponse,
  startScaleMeasurement,
  getScaleStatus,
  deleteScaleSession,
  ScaleSessionStatus
} from '@/services/api';

interface BodyFatProps {
  userId: string;
  userProfile: {
    height: number;
    age: number;
    gender: string;
  };
}

type PeriodType = '1week' | '1month' | '3months' | 'all';

const BodyFat: React.FC<BodyFatProps> = ({ userId, userProfile }) => {
  const { theme } = useTheme();

  // Data State
  const [latestData, setLatestData] = useState<BodyCompositionData | null>(null);
  const [historyData, setHistoryData] = useState<BodyCompositionHistoryItem[]>([]);
  const [statsData, setStatsData] = useState<BodyCompositionStatsResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1month');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BodyCompositionData | null>(null);

  // Scale Bridge State
  const [scaleStatus, setScaleStatus] = useState<ScaleSessionStatus | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Manual input fallback
  const [showManualInput, setShowManualInput] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputImpedance, setInputImpedance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const MEASUREMENT_TIMEOUT = 60; // 측정 대기 시간 (초)

  // Fetch data on mount
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadStats(selectedPeriod);
  }, [selectedPeriod]);

  // sessionId를 ref로 관리하여 cleanup에서 최신 값 사용
  const sessionIdRef = useRef<string | null>(null);

  // sessionId 변경 시 ref 업데이트
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Cleanup polling on unmount only
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (sessionIdRef.current) {
        deleteScaleSession(sessionIdRef.current);
      }
    };
  }, []); // Empty dependency - only runs on unmount

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [latest, history] = await Promise.all([
        fetchLatestBodyComposition(),
        fetchBodyCompositionHistory(1, 20)
      ]);
      setLatestData(latest);
      setHistoryData(history.data);
    } catch (error) {
      console.error('Failed to load body composition data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async (period: PeriodType) => {
    try {
      const stats = await fetchBodyCompositionStats(period);
      setStatsData(stats);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  // Scale Bridge 측정 시작
  const startMeasurement = async () => {
    console.log('🚀 Starting measurement...');
    setIsMeasuring(true);
    setScaleStatus(null);
    setShowManualInput(false);

    try {
      const result = await startScaleMeasurement(MEASUREMENT_TIMEOUT);
      console.log('📡 Start result:', result);

      if (!result) {
        setScaleStatus({
          session_id: '',
          status: 'error',
          message: '측정 시작 실패. 서버 연결을 확인하세요.',
          remaining_seconds: 0
        });
        setIsMeasuring(false);
        return;
      }

      setSessionId(result.session_id);
      console.log('🔄 Starting polling for session:', result.session_id);

      // 상태 폴링 시작
      pollingRef.current = setInterval(async () => {
        const status = await getScaleStatus(result.session_id);
        console.log('📊 Poll status:', status);

        if (status) {
          setScaleStatus(status);

          // 완료 또는 에러 시 폴링 중지
          if (status.status === 'complete' || status.status === 'error') {
            console.log('✅ Measurement finished:', status.status);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setIsMeasuring(false);

            // 완료 시 데이터 새로고침
            if (status.status === 'complete') {
              setTimeout(() => {
                loadData();
                loadStats(selectedPeriod);
              }, 1000);
            }
          }
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to start measurement', error);
      setScaleStatus({
        session_id: '',
        status: 'error',
        message: '측정 시작 중 오류가 발생했습니다.',
        remaining_seconds: 0
      });
      setIsMeasuring(false);
    }
  };

  // 측정 취소
  const cancelMeasurement = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (sessionId) {
      deleteScaleSession(sessionId);
    }
    setSessionId(null);
    setScaleStatus(null);
    setIsMeasuring(false);
  };

  // 수동 입력으로 저장
  const handleManualSave = async () => {
    const weight = parseFloat(inputWeight);
    const impedance = parseFloat(inputImpedance);

    if (!weight || weight <= 0) {
      alert('유효한 체중 데이터가 없습니다.');
      return;
    }

    // 임피던스가 없으면 기본값 사용 (체중 기반 추정)
    const finalImpedance = impedance && impedance > 0 ? impedance : Math.round(500 + (weight - 60) * 2);

    setIsSaving(true);
    try {
      const result = await saveBodyComposition({
        weight: Math.round(weight * 10) / 10,
        impedance: finalImpedance
      });

      setLatestData(result);
      setShowMeasureModal(false);
      setShowManualInput(false);
      setInputWeight('');
      setInputImpedance('');

      // Reload data
      loadData();
      loadStats(selectedPeriod);

      alert('측정 데이터가 저장되었습니다!');
    } catch (error) {
      console.error('Failed to save measurement', error);
      alert('저장 중 오류가 발생했습니다. 로그인 상태를 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // Body type translation
  const bodyTypeKorean: Record<string, string> = {
    'obese': '비만', 'overweight': '과체중', 'thick-set': '근육비만',
    'lack-exercise': '운동부족', 'balanced': '균형', 'balanced-muscular': '균형근육',
    'skinny': '마름', 'balanced-skinny': '균형마름', 'skinny-muscular': '마름근육'
  };

  // Status color helper
  const getStatusColor = (type: string, value: number | undefined) => {
    if (value === undefined) return 'gray';
    if (type === 'bmi') {
      if (value < 18.5) return 'yellow';
      if (value < 25) return 'green';
      if (value < 30) return 'yellow';
      return 'red';
    }
    if (type === 'body_fat') {
      const isMale = userProfile.gender === '남성' || userProfile.gender === 'male';
      const normal = isMale ? [10, 20] : [18, 28];
      if (value < normal[0]) return 'yellow';
      if (value <= normal[1]) return 'green';
      if (value <= normal[1] + 5) return 'yellow';
      return 'red';
    }
    if (type === 'visceral') {
      if (value <= 9) return 'green';
      if (value <= 14) return 'yellow';
      return 'red';
    }
    if (type === 'score') {
      if (value >= 80) return 'green';
      if (value >= 60) return 'yellow';
      return 'red';
    }
    return 'gray';
  };

  const statusColors = {
    green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500', gray: 'bg-gray-400'
  };

  // Chart rendering
  const renderChart = () => {
    if (!statsData || statsData.data.length === 0) {
      return (
        <div className={`flex items-center justify-center h-48 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>측정 데이터가 없습니다</p>
        </div>
      );
    }

    const data = statsData.data;
    const width = 320;
    const height = 160;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const weights = data.map(d => d.weight);
    const fatPcts = data.map(d => d.body_fat_percentage);
    const muscles = data.map(d => d.muscle_mass);

    const yMin = Math.min(...weights, ...muscles) - 5;
    const yMax = Math.max(...weights, ...muscles) + 5;
    const yFatMin = Math.min(...fatPcts) - 2;
    const yFatMax = Math.max(...fatPcts) + 2;

    const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const getY = (value: number) => padding.top + (1 - (value - yMin) / (yMax - yMin || 1)) * chartHeight;
    const getYFat = (value: number) => padding.top + (1 - (value - yFatMin) / (yFatMax - yFatMin || 1)) * chartHeight;

    const weightPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.weight)}`).join(' ');
    const fatPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYFat(d.body_fat_percentage)}`).join(' ');
    const musclePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.muscle_mass)}`).join(' ');

    return (
      <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="flex justify-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500 rounded"></div><span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>체중</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-orange-500 rounded"></div><span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>체지방률</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500 rounded"></div><span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>근육량</span></div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line key={i} x1={padding.left} y1={padding.top + ratio * chartHeight} x2={width - padding.right} y2={padding.top + ratio * chartHeight} stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="1" />
          ))}
          <path d={weightPath} fill="none" stroke="#3b82f6" strokeWidth="2" />
          <path d={fatPath} fill="none" stroke="#f97316" strokeWidth="2" />
          <path d={musclePath} fill="none" stroke="#22c55e" strokeWidth="2" />
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.weight)} r="3" fill="#3b82f6" />
              <circle cx={getX(i)} cy={getYFat(d.body_fat_percentage)} r="3" fill="#f97316" />
              <circle cx={getX(i)} cy={getY(d.muscle_mass)} r="3" fill="#22c55e" />
            </g>
          ))}
          {data.filter((_, i) => i === 0 || i === data.length - 1).map((d, i, arr) => {
            const originalIndex = i === 0 ? 0 : data.length - 1;
            return (<text key={i} x={getX(originalIndex)} y={height - 5} textAnchor="middle" className={`text-[10px] ${theme === 'dark' ? 'fill-gray-400' : 'fill-gray-500'}`}>{d.date.slice(5)}</text>);
          })}
        </svg>
        {statsData.changes && (
          <div className="flex justify-around mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xs text-gray-500">체중</div>
              <div className={`text-sm font-bold ${statsData.changes.weight > 0 ? 'text-red-500' : statsData.changes.weight < 0 ? 'text-blue-500' : 'text-gray-500'}`}>
                {statsData.changes.weight > 0 ? '+' : ''}{statsData.changes.weight}kg
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">체지방</div>
              <div className={`text-sm font-bold ${statsData.changes.body_fat > 0 ? 'text-red-500' : statsData.changes.body_fat < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                {statsData.changes.body_fat > 0 ? '+' : ''}{statsData.changes.body_fat}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">근육량</div>
              <div className={`text-sm font-bold ${statsData.changes.muscle_mass > 0 ? 'text-green-500' : statsData.changes.muscle_mass < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {statsData.changes.muscle_mass > 0 ? '+' : ''}{statsData.changes.muscle_mass}kg
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const MetricCard = ({ icon: Icon, label, value, unit, color, subValue }: {
    icon: any; label: string; value: number | string | undefined; unit: string; color: string; subValue?: string;
  }) => (
    <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={16} className="text-white" /></div>
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      </div>
      <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {value !== undefined ? value : '-'}<span className="text-sm font-normal ml-1">{unit}</span>
      </div>
      {subValue && <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{subValue}</div>}
    </div>
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-[#f8fafc]'}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full pb-32 overflow-y-auto no-scrollbar relative transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-[#f8fafc]'}`}>
      {/* Header */}
      <header className={`px-5 pb-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] sticky top-0 backdrop-blur-md z-20 ${theme === 'dark' ? 'bg-gray-900/80' : 'bg-white/80'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>체성분 분석</h1>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {latestData ? `최근 측정: ${new Date(latestData.measured_at!).toLocaleDateString('ko-KR')}` : '측정 기록 없음'}
            </p>
          </div>
          <button
            onClick={() => setShowMeasureModal(true)}
            className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium shadow-lg active:scale-95 transition-transform"
          >
            <Scale size={16} />
            측정
          </button>
        </div>
      </header>

      <div className="px-5 space-y-5">
        {/* Body Score Card */}
        {latestData && (
          <div className={`rounded-2xl p-5 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-primary/10 to-primary/5'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>체형 점수</div>
                <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {latestData.body_score}<span className="text-lg font-normal">점</span>
                </div>
                <div className={`text-sm mt-1 px-2 py-0.5 rounded-full inline-block ${statusColors[getStatusColor('score', latestData.body_score)]}/20`}>
                  <span className={`${statusColors[getStatusColor('score', latestData.body_score)].replace('bg-', 'text-')}`}>
                    {bodyTypeKorean[latestData.body_type || ''] || latestData.body_type}
                  </span>
                </div>
              </div>
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="8" />
                  <circle cx="48" cy="48" r="40" fill="none"
                    stroke={getStatusColor('score', latestData.body_score) === 'green' ? '#22c55e' : getStatusColor('score', latestData.body_score) === 'yellow' ? '#eab308' : '#ef4444'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(latestData.body_score || 0) * 2.51} 251`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Award size={28} className={statusColors[getStatusColor('score', latestData.body_score)].replace('bg-', 'text-')} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Metrics Grid */}
        {latestData ? (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Scale} label="체중" value={latestData.weight} unit="kg" color="bg-blue-500" subValue={`이상: ${latestData.ideal_weight}kg`} />
            <MetricCard icon={Activity} label="BMI" value={latestData.bmi} unit="" color={statusColors[getStatusColor('bmi', latestData.bmi)]} />
            <MetricCard icon={Droplet} label="체지방률" value={latestData.body_fat_percentage} unit="%" color={statusColors[getStatusColor('body_fat', latestData.body_fat_percentage)]} subValue={`${latestData.fat_mass}kg`} />
            <MetricCard icon={Zap} label="근육량" value={latestData.muscle_mass} unit="kg" color="bg-green-500" />
            <MetricCard icon={Droplet} label="수분" value={latestData.water_percentage} unit="%" color="bg-cyan-500" />
            <MetricCard icon={Bone} label="골량" value={latestData.bone_mass} unit="kg" color="bg-purple-500" />
            <MetricCard icon={Heart} label="내장지방" value={latestData.visceral_fat} unit="등급" color={statusColors[getStatusColor('visceral', latestData.visceral_fat)]} />
            <MetricCard icon={Zap} label="기초대사량" value={latestData.bmr} unit="kcal" color="bg-amber-500" />
            <MetricCard icon={Target} label="단백질" value={latestData.protein_percentage} unit="%" color="bg-pink-500" />
            <MetricCard icon={TrendingUp} label="대사연령" value={latestData.metabolic_age} unit="세" color="bg-indigo-500" subValue={`실제: ${userProfile.age}세`} />
          </div>
        ) : (
          <div className={`rounded-2xl p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <Scale size={48} className={`mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>측정 기록이 없습니다</p>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              상단의 '측정' 버튼을 눌러 체중계와 연결하세요
            </p>
          </div>
        )}

        {/* Chart Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>변화 추이</h2>
            <div className="flex gap-1">
              {(['1week', '1month', '3months', 'all'] as PeriodType[]).map(period => (
                <button key={period} onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedPeriod === period ? 'bg-primary text-white' : theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  {period === '1week' ? '1주' : period === '1month' ? '1달' : period === '3months' ? '3달' : '전체'}
                </button>
              ))}
            </div>
          </div>
          {renderChart()}
        </div>

        {/* History Section */}
        <div>
          <h2 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>측정 기록</h2>
          {historyData.length > 0 ? (
            <div className="space-y-2">
              {historyData.map((record) => (
                <button key={record.id} onClick={() => { setSelectedRecord(record as BodyCompositionData); setShowDetailModal(true); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm active:scale-[0.98] transition-transform`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[getStatusColor('score', record.body_score)]}/20`}>
                      <span className={`text-sm font-bold ${statusColors[getStatusColor('score', record.body_score)].replace('bg-', 'text-')}`}>{record.body_score}</span>
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(record.measured_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {record.weight}kg / 체지방 {record.body_fat_percentage}%
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={20} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />
                </button>
              ))}
            </div>
          ) : (
            <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>측정 기록이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Measure Modal */}
      {showMeasureModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => { if (!isMeasuring) { setShowMeasureModal(false); cancelMeasurement(); setShowManualInput(false); } }}>
          <div className={`w-full max-w-md rounded-t-3xl p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>체성분 측정</h3>
              <button onClick={() => { setShowMeasureModal(false); cancelMeasurement(); setShowManualInput(false); }} className="p-2">
                <X size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>

            {!showManualInput ? (
              <>
                {/* Scale Bridge UI */}
                <div className={`rounded-2xl p-6 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  {/* 상태 아이콘 */}
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    scaleStatus?.status === 'complete' ? 'bg-green-500/20' :
                    scaleStatus?.status === 'error' ? 'bg-red-500/20' :
                    isMeasuring ? 'bg-blue-500/20' :
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    {scaleStatus?.status === 'complete' ? (
                      <Scale className="text-green-500" size={32} />
                    ) : scaleStatus?.status === 'error' ? (
                      <AlertCircle className="text-red-500" size={32} />
                    ) : isMeasuring ? (
                      <Radio className="text-blue-500 animate-pulse" size={32} />
                    ) : (
                      <Scale className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} size={32} />
                    )}
                  </div>

                  {/* 상태 메시지 */}
                  <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {scaleStatus?.message || '측정 버튼을 눌러주세요'}
                  </p>

                  {/* 남은 시간 표시 */}
                  {isMeasuring && scaleStatus?.remaining_seconds && scaleStatus.remaining_seconds > 0 && (
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>
                      남은 시간: {scaleStatus.remaining_seconds}초
                    </p>
                  )}

                  {/* 에러 메시지 */}
                  {scaleStatus?.status === 'error' && scaleStatus?.error && (
                    <p className="text-sm text-red-500 mb-4">{scaleStatus.error}</p>
                  )}

                  {/* 측정 데이터 표시 */}
                  {scaleStatus?.weight && (
                    <div className="mb-4">
                      <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {scaleStatus.weight.toFixed(1)}<span className="text-lg font-normal ml-1">kg</span>
                      </div>
                      {scaleStatus.impedance && (
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          임피던스: {scaleStatus.impedance} Ω
                        </div>
                      )}
                      {scaleStatus.heart_rate && (
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          심박수: {scaleStatus.heart_rate} bpm
                        </div>
                      )}
                    </div>
                  )}

                  {/* 완료 시 체성분 결과 미리보기 */}
                  {scaleStatus?.status === 'complete' && scaleStatus?.body_score && (
                    <div className={`grid grid-cols-2 gap-2 text-sm mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'}`}>
                      <div className="text-left">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>BMI</span>
                        <span className={`block font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scaleStatus.bmi?.toFixed(1)}</span>
                      </div>
                      <div className="text-left">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>체지방률</span>
                        <span className={`block font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scaleStatus.body_fat_percentage?.toFixed(1)}%</span>
                      </div>
                      <div className="text-left">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>근육량</span>
                        <span className={`block font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scaleStatus.muscle_mass?.toFixed(1)}kg</span>
                      </div>
                      <div className="text-left">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>체형점수</span>
                        <span className={`block font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{scaleStatus.body_score}점</span>
                      </div>
                    </div>
                  )}

                  {/* 시작 버튼 */}
                  {!isMeasuring && scaleStatus?.status !== 'complete' && (
                    <button
                      onClick={startMeasurement}
                      className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                    >
                      측정 시작
                    </button>
                  )}

                  {/* 측정 중 취소 버튼 */}
                  {isMeasuring && (
                    <button
                      onClick={cancelMeasurement}
                      className={`w-full py-3 font-bold rounded-xl ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                    >
                      측정 취소
                    </button>
                  )}

                  {/* 완료 후 확인 버튼 */}
                  {scaleStatus?.status === 'complete' && (
                    <button
                      onClick={() => { setShowMeasureModal(false); setScaleStatus(null); }}
                      className="w-full py-3 bg-green-500 text-white font-bold rounded-xl"
                    >
                      확인
                    </button>
                  )}

                  {/* 에러 시 재시도 버튼 */}
                  {scaleStatus?.status === 'error' && (
                    <button
                      onClick={() => { setScaleStatus(null); startMeasurement(); }}
                      className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                    >
                      다시 시도
                    </button>
                  )}

                  {/* 측정 중 안내 */}
                  {isMeasuring && scaleStatus?.status !== 'error' && (
                    <div className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p>체중계 위에서 심박수까지 측정해주세요</p>
                      <p className="mt-1 text-xs">측정이 완료되면 자동으로 저장됩니다</p>
                    </div>
                  )}
                </div>

                {/* Manual input toggle */}
                {!isMeasuring && scaleStatus?.status !== 'complete' && (
                  <button
                    onClick={() => setShowManualInput(true)}
                    className={`w-full mt-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    수동으로 입력하기
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Manual Input Form */}
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>체중 (kg) *</label>
                    <input type="number" step="0.1" value={inputWeight} onChange={e => setInputWeight(e.target.value)} placeholder="예: 70.5"
                      className={`w-full mt-1 p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>임피던스 (ohm) - 선택</label>
                    <input type="number" value={inputImpedance} onChange={e => setInputImpedance(e.target.value)} placeholder="예: 450 (없으면 자동 추정)"
                      className={`w-full mt-1 p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`} />
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>입력하지 않으면 체중 기반으로 추정합니다</p>
                  </div>
                </div>

                <button onClick={handleManualSave} disabled={isSaving || !inputWeight}
                  className="w-full mt-6 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50">
                  {isSaving ? '저장 중...' : '저장하기'}
                </button>

                <button onClick={() => setShowManualInput(false)}
                  className={`w-full mt-2 py-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  자동 측정으로 돌아가기
                </button>
              </>
            )}

            <p className={`text-xs text-center mt-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              키: {userProfile.height}cm / 나이: {userProfile.age}세 / 성별: {userProfile.gender}
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className={`w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {selectedRecord.measured_at ? new Date(selectedRecord.measured_at).toLocaleDateString('ko-KR') : ''} 측정 결과
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2">
                <X size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['체중', selectedRecord.weight, 'kg'], ['BMI', selectedRecord.bmi, ''],
                ['체지방률', selectedRecord.body_fat_percentage, '%'], ['근육량', selectedRecord.muscle_mass, 'kg'],
                ['수분', selectedRecord.water_percentage, '%'], ['골량', selectedRecord.bone_mass, 'kg'],
                ['내장지방', selectedRecord.visceral_fat, '등급'], ['기초대사량', selectedRecord.bmr, 'kcal'],
                ['단백질', selectedRecord.protein_percentage, '%'], ['대사연령', selectedRecord.metabolic_age, '세'],
                ['이상체중', selectedRecord.ideal_weight, 'kg'], ['체형점수', selectedRecord.body_score, '점'],
              ].map(([label, value, unit]) => (
                <div key={label as string} className={`flex justify-between py-2 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value !== undefined ? `${value}${unit}` : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyFat;
