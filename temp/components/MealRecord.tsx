
import React, { useState, useMemo } from 'react';
import { 
  Plus, Clock, Trash2, Calendar as CalendarIcon, ChevronDown, Droplet, Activity
} from 'lucide-react';
import { BloodSugarEntry } from '../App';

interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
}

interface MealRecordProps {
  bloodSugarHistory: Record<string, BloodSugarEntry>;
  onUpdateBloodSugar: (date: string, data: BloodSugarEntry) => void;
}

const MealRecord: React.FC<MealRecordProps> = ({ bloodSugarHistory, onUpdateBloodSugar }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [isMonthView, setIsMonthView] = useState(false);
  
  const [mealData, setMealData] = useState<Record<string, MealPlan>>(() => {
    const saved = localStorage.getItem('caremeal_meal_plan');
    return saved ? JSON.parse(saved) : {};
  });

  const [editingMeal, setEditingMeal] = useState<{type: keyof MealPlan | 'fasting' | 'postBreakfast' | 'postLunch' | 'postDinner', date: string} | null>(null);
  const [tempText, setTempText] = useState('');
  const [tempValue, setTempValue] = useState<number | string>('');

  const weekDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push({
        full: d.toISOString().split('T')[0],
        day: d.getDate(),
        label: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
        isToday: d.toISOString().split('T')[0] === todayStr
      });
    }
    return dates;
  }, [selectedDate, todayStr]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        full: d.toISOString().split('T')[0],
        day: i,
        isToday: d.toISOString().split('T')[0] === todayStr
      });
    }
    return days;
  }, [viewDate, todayStr]);

  const currentMeals = mealData[selectedDate] || { breakfast: '', lunch: '', dinner: '' };
  const currentBloodSugar = bloodSugarHistory[selectedDate] || {};

  const handleEdit = (type: any, isSugar: boolean = false) => {
    setEditingMeal({ type, date: selectedDate });
    if (isSugar) {
      setTempValue(currentBloodSugar[type as keyof BloodSugarEntry] || '');
      setTempText('');
    } else {
      setTempText(currentMeals[type as keyof MealPlan]);
      setTempValue('');
    }
  };

  const saveData = () => {
    if (!editingMeal) return;
    
    if (['fasting', 'postBreakfast', 'postLunch', 'postDinner'].includes(editingMeal.type)) {
      const val = tempValue === '' ? undefined : Number(tempValue);
      onUpdateBloodSugar(selectedDate, {
        ...currentBloodSugar,
        [editingMeal.type]: val
      });
    } else {
      const newMealData = {
        ...mealData,
        [selectedDate]: {
          ...currentMeals,
          [editingMeal.type]: tempText
        }
      };
      setMealData(newMealData);
      localStorage.setItem('caremeal_meal_plan', JSON.stringify(newMealData));
    }
    setEditingMeal(null);
  };

  const getSugarStatusColor = (val: number, type: string) => {
    if (type === 'fasting') {
      if (val < 100) return 'text-emerald-500';
      if (val < 126) return 'text-orange-500';
      return 'text-rose-500';
    } else {
      if (val < 140) return 'text-emerald-500';
      if (val < 200) return 'text-orange-500';
      return 'text-rose-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] pb-32 overflow-y-auto no-scrollbar relative">
      <header className="px-5 pb-5 pt-[calc(env(safe-area-inset-top,12px)+12px)] bg-white border-b border-gray-100 sticky top-0 z-30">
        <h1 className="text-xl font-bold text-gray-900">나의 식단 & 혈당기록</h1>
      </header>

      {/* Calendar Section */}
      <div className="px-5 mt-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div onClick={() => setIsMonthView(!isMonthView)} className="flex items-center space-x-1 cursor-pointer">
            <h2 className="text-base font-black text-gray-800">
              {isMonthView ? `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월` : '달력 보기'}
            </h2>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isMonthView ? 'rotate-180' : ''}`} />
          </div>
          <button onClick={() => setIsMonthView(!isMonthView)} className={`p-2 rounded-xl ${isMonthView ? 'bg-primary text-white' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <CalendarIcon size={18} />
          </button>
        </div>

        {isMonthView ? (
          <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 animate-fadeIn">
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="aspect-square" />;
                const isSelected = selectedDate === date.full;
                return (
                  <button key={date.full} onClick={() => { setSelectedDate(date.full); setIsMonthView(false); }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-primary text-white font-bold' : date.isToday ? 'bg-gray-50 text-primary font-bold' : 'text-gray-700'}`}
                  >
                    <span className="text-xs">{date.day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
            {weekDates.map((date) => (
              <button key={date.full} onClick={() => setSelectedDate(date.full)}
                className={`flex-shrink-0 w-12 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${selectedDate === date.full ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
              >
                <span className="text-[10px] font-bold mb-1">{date.label}</span>
                <span className="text-base font-black">{date.day}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Blood Sugar Section - Fasting */}
      <div className="px-5 mb-6">
        <div className="bg-rose-50 p-5 rounded-[28px] border border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
              <Droplet size={24} />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900">공복 혈당</span>
              <p className={`text-lg font-black ${currentBloodSugar.fasting ? getSugarStatusColor(currentBloodSugar.fasting, 'fasting') : 'text-gray-300'}`}>
                {currentBloodSugar.fasting ? `${currentBloodSugar.fasting} mg/dL` : '미입력'}
              </p>
            </div>
          </div>
          <button onClick={() => handleEdit('fasting', true)} className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-95 transition-transform">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Meal & Post-meal Sugar Logger */}
      <div className="px-5 space-y-4 mb-8">
        {[
          { id: 'breakfast', sugarId: 'postBreakfast', label: '아침', time: '08:00', icon: '☀️' },
          { id: 'lunch', sugarId: 'postLunch', label: '점심', time: '12:30', icon: '🌤️' },
          { id: 'dinner', sugarId: 'postDinner', label: '저녁', time: '19:00', icon: '🌙' }
        ].map((slot) => (
          <div key={slot.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl">{slot.icon}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{slot.label}</span>
                    <span className="text-[10px] text-gray-400"><Clock size={10} className="inline mr-1" />{slot.time}</span>
                  </div>
                  <p className={`text-sm mt-0.5 ${currentMeals[slot.id as keyof MealPlan] ? 'text-gray-800 font-medium' : 'text-gray-300 italic'}`}>
                    {currentMeals[slot.id as keyof MealPlan] || '식단 기록 전'}
                  </p>
                </div>
              </div>
              <button onClick={() => handleEdit(slot.id)} className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Plus size={20} />
              </button>
            </div>

            <div className="h-px bg-gray-50 w-full" />

            <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Activity size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500">식후 2시간 혈당</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-black ${currentBloodSugar[slot.sugarId as keyof BloodSugarEntry] ? getSugarStatusColor(currentBloodSugar[slot.sugarId as keyof BloodSugarEntry] as number, 'post') : 'text-gray-300'}`}>
                  {currentBloodSugar[slot.sugarId as keyof BloodSugarEntry] ? `${currentBloodSugar[slot.sugarId as keyof BloodSugarEntry]} mg/dL` : '-'}
                </span>
                <button onClick={() => handleEdit(slot.sugarId, true)} className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg">
                  입력
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingMeal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,20px)]" onClick={() => setEditingMeal(null)}>
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingMeal.type.startsWith('post') || editingMeal.type === 'fasting' ? '혈당 기록' : '식단 기록'}
            </h3>
            
            {editingMeal.type.startsWith('post') || editingMeal.type === 'fasting' ? (
              <div className="relative">
                <input 
                  type="number" 
                  autoFocus 
                  value={tempValue} 
                  onChange={(e) => setTempValue(e.target.value)} 
                  placeholder="혈당 수치 입력"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-xl font-black text-center" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">mg/dL</span>
              </div>
            ) : (
              <textarea autoFocus value={tempText} onChange={(e) => setTempText(e.target.value)} placeholder="어떤 음식을 드셨나요?"
                className="w-full h-32 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm resize-none" />
            )}

            <div className="flex space-x-2 mt-6">
              <button onClick={() => setEditingMeal(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl">취소</button>
              <button onClick={saveData} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealRecord;
