
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Clock, Trash2, Calendar as CalendarIcon, ChevronDown, Droplet, Activity, Camera, Loader2
} from 'lucide-react';
import { BloodSugarEntry } from '@/App';
import { DailyMealPlan, MealItem } from '@/types';
import { analyzeFoodImage, fetchMealRecord, saveMealRecord, MealRecordData } from '@/services/api';

interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
}

interface MealRecordProps {
  bloodSugarHistory: Record<string, BloodSugarEntry>;
  onUpdateBloodSugar: (date: string, data: BloodSugarEntry) => void;
  mealData: Record<string, DailyMealPlan>;
  onUpdateMeal: (date: string, time: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'lateNightSnack', item: MealItem) => void;
  userId: string;
}

const MealRecord: React.FC<MealRecordProps> = ({ bloodSugarHistory, onUpdateBloodSugar, mealData, onUpdateMeal, userId }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [isMonthView, setIsMonthView] = useState(false);

  const [editingMeal, setEditingMeal] = useState<{ type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'lateNightSnack' | 'fasting' | 'postBreakfast' | 'postLunch' | 'postDinner', date: string } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Temp states for structured meal data
  const [tempMenu, setTempMenu] = useState('');
  const [tempCal, setTempCal] = useState<number | string>('');
  const [tempCarb, setTempCarb] = useState<number | string>('');
  const [tempProt, setTempProt] = useState<number | string>('');
  const [tempFat, setTempFat] = useState<number | string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const currentMeals = mealData[selectedDate] || {};
  const currentBloodSugar = bloodSugarHistory[selectedDate] || {};

  // Fetch meal record data from backend when selectedDate changes
  useEffect(() => {
    const loadMealRecord = async () => {
      try {
        const data = await fetchMealRecord(userId, selectedDate);
        if (data) {
          // Update blood sugar data
          if (data.blood_sugar) {
            onUpdateBloodSugar(selectedDate, data.blood_sugar as BloodSugarEntry);
          }

          // Update meal data
          if (data.meals) {
            if (data.meals.breakfast) {
              onUpdateMeal(selectedDate, 'breakfast', {
                menu: data.meals.breakfast.menu,
                nutrition: {
                  calories: data.meals.breakfast.calories,
                  carbs: data.meals.breakfast.carbs,
                  protein: data.meals.breakfast.protein,
                  fat: data.meals.breakfast.fat,
                }
              });
            }
            if (data.meals.lunch) {
              onUpdateMeal(selectedDate, 'lunch', {
                menu: data.meals.lunch.menu,
                nutrition: {
                  calories: data.meals.lunch.calories,
                  carbs: data.meals.lunch.carbs,
                  protein: data.meals.lunch.protein,
                  fat: data.meals.lunch.fat,
                }
              });
            }
            if (data.meals.dinner) {
              onUpdateMeal(selectedDate, 'dinner', {
                menu: data.meals.dinner.menu,
                nutrition: {
                  calories: data.meals.dinner.calories,
                  carbs: data.meals.dinner.carbs,
                  protein: data.meals.dinner.protein,
                  fat: data.meals.dinner.fat,
                }
              });
            }
            if (data.meals.snack) {
              onUpdateMeal(selectedDate, 'snack', {
                menu: data.meals.snack.menu,
                nutrition: {
                  calories: data.meals.snack.calories,
                  carbs: data.meals.snack.carbs,
                  protein: data.meals.snack.protein,
                  fat: data.meals.snack.fat,
                }
              });
            }
            if (data.meals.lateNightSnack) {
              onUpdateMeal(selectedDate, 'lateNightSnack', {
                menu: data.meals.lateNightSnack.menu,
                nutrition: {
                  calories: data.meals.lateNightSnack.calories,
                  carbs: data.meals.lateNightSnack.carbs,
                  protein: data.meals.lateNightSnack.protein,
                  fat: data.meals.lateNightSnack.fat,
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load meal record:", error);
      }
    };

    loadMealRecord();
  }, [selectedDate, userId]);

  const parseAIResponse = (text: string) => {
    try {
      const jsonMatch = text.match(/###JSON_START###([\s\S]*?)###JSON_END###/);
      if (jsonMatch && jsonMatch[1]) {
        const data = JSON.parse(jsonMatch[1]);
        return {
          menu: data.menu || '',
          nutrition: {
            calories: data.calories || 0,
            carbs: data.carbs || 0,
            protein: data.protein || 0,
            fat: data.fat || 0
          }
        };
      }
    } catch (e) {
      console.error("JSON parsing failed", e);
    }
    return null;
  };

  const handleEdit = (type: any, isSugar: boolean = false) => {
    setEditingMeal({ type, date: selectedDate });
    if (isSugar) {
      setTempValue(currentBloodSugar[type as keyof BloodSugarEntry] || '');
    } else {
      // Load existing meal data if available
      const meal = (currentMeals as any)[type] as MealItem | undefined;
      setTempMenu(meal?.menu || '');
      setTempCal(meal?.nutrition.calories || '');
      setTempCarb(meal?.nutrition.carbs || '');
      setTempProt(meal?.nutrition.protein || '');
      setTempFat(meal?.nutrition.fat || '');
    }
  };

  const saveData = async () => {
    if (!editingMeal) return;

    // Update local state first
    let updatedBloodSugar = { ...currentBloodSugar };
    let updatedMeals = { ...currentMeals };

    if (['fasting', 'postBreakfast', 'postLunch', 'postDinner'].includes(editingMeal.type)) {
      const val = tempValue === '' ? undefined : Number(tempValue);
      updatedBloodSugar = {
        ...currentBloodSugar,
        [editingMeal.type]: val
      };
      onUpdateBloodSugar(selectedDate, updatedBloodSugar);
    } else {
      const newItem: MealItem = {
        menu: tempMenu,
        nutrition: {
          calories: Number(tempCal) || 0,
          carbs: Number(tempCarb) || 0,
          protein: Number(tempProt) || 0,
          fat: Number(tempFat) || 0,
        }
      };
      updatedMeals = {
        ...currentMeals,
        [editingMeal.type]: newItem
      };
      onUpdateMeal(selectedDate, editingMeal.type as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'lateNightSnack', newItem);
    }

    // Prepare data for backend
    const recordData: MealRecordData = {
      user_id: userId,
      date: selectedDate,
      meals: {},
      blood_sugar: {}
    };

    // Collect all meal data for this date
    const mealsToSave = ['fasting', 'postBreakfast', 'postLunch', 'postDinner'].includes(editingMeal.type)
      ? currentMeals
      : updatedMeals;

    if (mealsToSave.breakfast) {
      recordData.meals!.breakfast = {
        menu: mealsToSave.breakfast.menu,
        calories: mealsToSave.breakfast.nutrition.calories,
        carbs: mealsToSave.breakfast.nutrition.carbs,
        protein: mealsToSave.breakfast.nutrition.protein,
        fat: mealsToSave.breakfast.nutrition.fat,
      };
    }
    if (mealsToSave.lunch) {
      recordData.meals!.lunch = {
        menu: mealsToSave.lunch.menu,
        calories: mealsToSave.lunch.nutrition.calories,
        carbs: mealsToSave.lunch.nutrition.carbs,
        protein: mealsToSave.lunch.nutrition.protein,
        fat: mealsToSave.lunch.nutrition.fat,
      };
    }
    if (mealsToSave.dinner) {
      recordData.meals!.dinner = {
        menu: mealsToSave.dinner.menu,
        calories: mealsToSave.dinner.nutrition.calories,
        carbs: mealsToSave.dinner.nutrition.carbs,
        protein: mealsToSave.dinner.nutrition.protein,
        fat: mealsToSave.dinner.nutrition.fat,
      };
    }
    if (mealsToSave.snack) {
      recordData.meals!.snack = {
        menu: mealsToSave.snack.menu,
        calories: mealsToSave.snack.nutrition.calories,
        carbs: mealsToSave.snack.nutrition.carbs,
        protein: mealsToSave.snack.nutrition.protein,
        fat: mealsToSave.snack.nutrition.fat,
      };
    }
    if (mealsToSave.lateNightSnack) {
      recordData.meals!.lateNightSnack = {
        menu: mealsToSave.lateNightSnack.menu,
        calories: mealsToSave.lateNightSnack.nutrition.calories,
        carbs: mealsToSave.lateNightSnack.nutrition.carbs,
        protein: mealsToSave.lateNightSnack.nutrition.protein,
        fat: mealsToSave.lateNightSnack.nutrition.fat,
      };
    }

    // Collect all blood sugar data for this date
    const bloodSugarToSave = ['fasting', 'postBreakfast', 'postLunch', 'postDinner'].includes(editingMeal.type)
      ? updatedBloodSugar
      : currentBloodSugar;

    if (bloodSugarToSave.fasting !== undefined) {
      recordData.blood_sugar!.fasting = bloodSugarToSave.fasting;
    }
    if (bloodSugarToSave.postBreakfast !== undefined) {
      recordData.blood_sugar!.postBreakfast = bloodSugarToSave.postBreakfast;
    }
    if (bloodSugarToSave.postLunch !== undefined) {
      recordData.blood_sugar!.postLunch = bloodSugarToSave.postLunch;
    }
    if (bloodSugarToSave.postDinner !== undefined) {
      recordData.blood_sugar!.postDinner = bloodSugarToSave.postDinner;
    }

    // Save to backend
    try {
      await saveMealRecord(recordData);
      console.log("Meal record saved successfully");
    } catch (error) {
      console.error("Failed to save meal record to backend:", error);
      alert("데이터 저장에 실패했습니다. 다시 시도해주세요.");
    }

    setEditingMeal(null);
  };

  const handleImageAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const response = await analyzeFoodImage(userId, file);
      const parsed = parseAIResponse(response.reply);

      if (parsed) {
        setTempMenu(parsed.menu);
        setTempCal(parsed.nutrition.calories);
        setTempCarb(parsed.nutrition.carbs);
        setTempProt(parsed.nutrition.protein);
        setTempFat(parsed.nutrition.fat);
        alert("분석 완료! 내용을 확인하고 수정해주세요.");
      } else {
        setTempMenu(response.reply.slice(0, 100) + "...");
        alert("자동 분석에 실패하여 텍스트만 가져왔습니다.");
      }
    } catch (err) {
      alert("이미지 분석 실패");
    } finally {
      setIsAnalyzing(false);
    }
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
      <div className="px-5 space-y-4 mb-24">
        {[
          { id: 'breakfast', sugarId: 'postBreakfast', label: '아침', time: '08:00', icon: '☀️' },
          { id: 'lunch', sugarId: 'postLunch', label: '점심', time: '12:30', icon: '🌤️' },
          { id: 'dinner', sugarId: 'postDinner', label: '저녁', time: '19:00', icon: '🌙' },
          { id: 'snack', sugarId: null, label: '간식', time: '15:00', icon: '🍪' },
          { id: 'lateNightSnack', sugarId: null, label: '야식', time: '21:00', icon: '🍗' }
        ].filter(slot => {
          // Always show breakfast, lunch, dinner
          if (['breakfast', 'lunch', 'dinner'].includes(slot.id)) return true;
          // Only show snack/lateNightSnack if they have data
          return !!currentMeals[slot.id as keyof DailyMealPlan];
        }).map((slot) => (
          <div key={slot.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl">{slot.icon}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{slot.label}</span>
                    <span className="text-[10px] text-gray-400"><Clock size={10} className="inline mr-1" />{slot.time}</span>
                  </div>
                  <p className={`text-sm mt-0.5 ${currentMeals[slot.id as keyof DailyMealPlan] ? 'text-gray-800 font-medium' : 'text-gray-300 italic'}`}>
                    {currentMeals[slot.id as keyof DailyMealPlan]?.menu || '식단 기록 전'}
                  </p>
                  {currentMeals[slot.id as keyof DailyMealPlan] && (
                    <div className="flex space-x-2 mt-1 text-xs text-gray-400">
                      <span>{currentMeals[slot.id as keyof DailyMealPlan]?.nutrition.calories}kcal</span>
                      <span>탄수화물:{currentMeals[slot.id as keyof DailyMealPlan]?.nutrition.carbs}</span>
                      <span>프로틴:{currentMeals[slot.id as keyof DailyMealPlan]?.nutrition.protein}</span>
                      <span>지방:{currentMeals[slot.id as keyof DailyMealPlan]?.nutrition.fat}</span>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => handleEdit(slot.id)} className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Plus size={20} />
              </button>
            </div>

            {slot.sugarId && (
              <>
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
                    <button onClick={() => handleEdit(slot.sugarId!, true)} className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg">
                      입력
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add Meal Button (Static) */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowAddMenu(true)}
            className="bg-primary text-white px-4 py-2 rounded-full shadow-sm flex items-center gap-1.5 text-sm font-bold transition-transform active:scale-95"
          >
            <Plus size={16} />
            <span className="pr-1">식단 추가</span>
          </button>
        </div>
      </div>



      {/* Add Menu Bottom Sheet */}
      {showAddMenu && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,20px)]" onClick={() => setShowAddMenu(false)}>
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl animate-slideUp space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">어떤 식단을 추가할까요?</h3>
            <button onClick={() => { setShowAddMenu(false); handleEdit('snack'); }} className="w-full p-4 bg-orange-50 rounded-2xl flex items-center gap-4 hover:bg-orange-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">🍪</div>
              <div className="text-left">
                <p className="font-bold text-gray-900">간식 추가</p>
                <p className="text-xs text-gray-500">오후 3:00</p>
              </div>
            </button>
            <button onClick={() => { setShowAddMenu(false); handleEdit('lateNightSnack'); }} className="w-full p-4 bg-indigo-50 rounded-2xl flex items-center gap-4 hover:bg-indigo-100 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">🍗</div>
              <div className="text-left">
                <p className="font-bold text-gray-900">야식 추가</p>
                <p className="text-xs text-gray-500">오후 9:00</p>
              </div>
            </button>
            <button onClick={() => setShowAddMenu(false)} className="w-full py-4 text-gray-400 font-bold">닫기</button>
          </div>
        </div>
      )}

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
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-2">
                  <label className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 cursor-pointer active:scale-95 transition-transform">
                    {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                    <span>{isAnalyzing ? '분석 중...' : '사진으로 자동 입력'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageAnalysis} disabled={isAnalyzing} />
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">메뉴 이름 / 설명</label>
                  <textarea
                    autoFocus
                    value={tempMenu}
                    onChange={(e) => setTempMenu(e.target.value)}
                    placeholder="예: 현미밥 1공기, 미역국, 고등어구이"
                    className="w-full h-20 p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">칼로리 (kcal)</label>
                    <input type="number" value={tempCal} onChange={(e) => setTempCal(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">탄수화물 (g)</label>
                    <input type="number" value={tempCarb} onChange={(e) => setTempCarb(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">단백질 (g)</label>
                    <input type="number" value={tempProt} onChange={(e) => setTempProt(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400">지방 (g)</label>
                    <input type="number" value={tempFat} onChange={(e) => setTempFat(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold" />
                  </div>
                </div>
              </div>
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
