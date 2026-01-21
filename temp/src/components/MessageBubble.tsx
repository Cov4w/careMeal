
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User as UserIcon, Stethoscope, Trash2, ChevronRight, Utensils, Plus, Check } from 'lucide-react';
import { Message, MealItem } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onDelete?: () => void;
  onNavigate?: (view: any) => void;
  onSaveMeal?: (time: 'breakfast' | 'lunch' | 'dinner', item: MealItem) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onDelete, onNavigate, onSaveMeal }) => {
  const isUser = message.sender === 'user';
  const hasDietLink = message.text.includes('[[CUSTOM_DIET_LINK]]');
  const cleanText = message.text.replace('[[CUSTOM_DIET_LINK]]', '').trim();

  // Helper to parse JSON from AI response
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

  const displayText = cleanText.replace(/###JSON_START###[\s\S]*?###JSON_END###/, '').trim();
  const [savedTime, setSavedTime] = React.useState<string | null>(null);

  const handleSaveMeal = (time: 'breakfast' | 'lunch' | 'dinner') => {
    const parsed = parseAIResponse(message.text);
    let item: MealItem;

    if (parsed) {
      item = {
        menu: parsed.menu,
        nutrition: parsed.nutrition,
        image: message.image
      };
    } else {
      // Fallback
      const text = message.text;
      const calMatch = text.match(/(\d+)\s*kcal/i);
      const carbMatch = text.match(/탄수화물.*?(\d+)\s*g/);
      const protMatch = text.match(/단백질.*?(\d+)\s*g/);
      const fatMatch = text.match(/지방.*?(\d+)\s*g/);

      item = {
        menu: text.split('\n')[0].substring(0, 50),
        nutrition: {
          calories: calMatch ? parseInt(calMatch[1]) : 0,
          carbs: carbMatch ? parseInt(carbMatch[1]) : 0,
          protein: protMatch ? parseInt(protMatch[1]) : 0,
          fat: fatMatch ? parseInt(fatMatch[1]) : 0,
        },
        image: message.image
      };
    }

    if (onSaveMeal) onSaveMeal(time, item);
    setSavedTime(time);
  };

  return (
    <div className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUser ? 'ml-3 bg-blue-100 text-blue-600' : 'mr-3 bg-primary-light text-white'}`}>
          {isUser ? <UserIcon size={20} /> : <Stethoscope size={20} />}
        </div>

        {/* Bubble Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} relative`}>
          {/* Sender Name */}
          <span className="text-xs text-gray-400 mb-1 px-1 flex items-center space-x-2">
            <span>{isUser ? '나' : '김닥터'}</span>
            {onDelete && message.id !== 'init-1' && (
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-rose-500 p-0.5"
                title="메시지 삭제"
              >
                <Trash2 size={12} />
              </button>
            )}
          </span>

          {/* Message Text */}
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words relative
              ${isUser
                ? 'bg-secondary text-white rounded-tr-none'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
              }`}
          >
            {message.image && (
              <div className="mb-2">
                <img src={message.image} alt="Uploaded content" className="rounded-lg max-w-full h-auto border border-white/20" />
              </div>
            )}
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.text}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 text-gray-800">
                <ReactMarkdown>{displayText}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Custom Diet Link Card */}
          {!isUser && hasDietLink && (
            <button
              onClick={() => onNavigate && onNavigate('customDiet')}
              className="mt-3 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left group/card hover:border-primary hover:shadow-md transition-all animate-slideDown flex items-center space-x-4 max-w-xs"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 group-hover/card:scale-110 transition-transform">
                <Utensils size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm mb-0.5">맞춤 식단 보러가기</h4>
                <p className="text-xs text-gray-400">AI가 추천하는 오늘의 메뉴 확인하기</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover/card:text-primary" />
            </button>
          )}

          {/* Meal Save Buttons (Analysis Result) */}
          {!isUser && message.isAnalysis && onSaveMeal && (
            <div className="mt-3 bg-white border border-gray-100 p-3 rounded-xl shadow-sm animate-slideDown">
              <p className="text-xs font-bold text-gray-400 mb-2 flex items-center">
                <Utensils size={12} className="mr-1" />
                식단 기록에 추가하기
              </p>
              <div className="flex space-x-2">
                {['breakfast', 'lunch', 'dinner'].map((time) => {
                  const isSaved = savedTime === time;
                  const labels: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' };
                  return (
                    <button
                      key={time}
                      onClick={() => handleSaveMeal(time as 'breakfast')}
                      disabled={!!savedTime}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all
                                    ${isSaved
                          ? 'bg-green-100 text-green-600 border border-green-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-primary-light hover:text-white border border-gray-100'
                        }`}
                    >
                      {isSaved ? <Check size={12} /> : <Plus size={12} />}
                      <span>{labels[time]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sources (for AI only) */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100 w-full animate-slideDown">
              <p className="font-semibold mb-1">참고 자료:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {message.sources.map((source, idx) => (
                  <li key={idx}>{source}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <span className="text-[10px] text-gray-400 mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
