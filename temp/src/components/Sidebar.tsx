import React from 'react';
import { Activity, RefreshCcw, Info, LogOut } from 'lucide-react';

interface SidebarProps {
  onReset: () => void;
  onLogout: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onReset, onLogout, className = '' }) => {
  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
          <Activity size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">CareMeal</h2>
        <p className="text-xs text-gray-500 mt-1">당뇨/식단 관리 파트너</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">서비스 소개</h3>
          <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 leading-relaxed">
            <p className="mb-2">
              <strong>김닥터</strong>님은 환자분의 데이터를 기반으로 맞춤형 식단과 혈당 관리 조언을 제공합니다.
            </p>
            <div className="flex items-start mt-3 text-xs opacity-80">
              <Info size={14} className="mr-1 mt-0.5 flex-shrink-0" />
              <span>실제 의료 상담을 대체할 수 없으며, 참고용으로만 활용해주세요.</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">설정</h3>
          <button 
            onClick={onReset}
            className="w-full flex items-center p-3 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors mb-2 group"
          >
            <RefreshCcw size={18} className="mr-3 text-gray-400 group-hover:text-primary transition-colors" />
            대화 기록 초기화
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center p-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} className="mr-2" />
          로그아웃
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;