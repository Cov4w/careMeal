
import React from 'react';
import { Home, Calendar, MessageCircle, Utensils, Activity, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export type TabId = 'home' | 'mealRecord' | 'chatbot' | 'customDiet' | 'bodyFat' | 'mypage';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { theme } = useTheme();

  const navItems = [
    { id: 'home', label: '홈', icon: Home },
    { id: 'mealRecord', label: '식단기록', icon: Calendar },
    { id: 'chatbot', label: '챗봇', icon: MessageCircle },
    { id: 'customDiet', label: '맞춤식단', icon: Utensils },
    { id: 'bodyFat', label: '체지방', icon: Activity },
    { id: 'mypage', label: '마이', icon: User },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-md border-t flex items-center justify-around pb-[env(safe-area-inset-bottom,16px)] pt-3 px-2 z-30 transition-colors ${theme === 'dark' ? 'bg-gray-900/90 border-gray-700 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]' : 'bg-white/80 border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as TabId)}
            className={`flex flex-col items-center flex-1 transition-all duration-200 active:scale-90 touch-none py-1 ${isActive ? 'text-primary' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
