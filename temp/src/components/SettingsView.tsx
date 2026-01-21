
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, BookOpen, Clock, ChevronRight, CheckCircle2, Info } from 'lucide-react';

interface SettingsViewProps {
    onBack: () => void;
}

interface AlarmSetting {
    id: string;
    label: string;
    time: string;
    enabled: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'alarm' | 'guide'>('alarm');

    const [alarms, setAlarms] = useState<AlarmSetting[]>(() => {
        const defaultAlarms = [
            { id: 'fasting', label: '공복 혈당 측정 ', time: '07:00', enabled: true },
            { id: 'breakfast', label: '아침 식단 기록 ', time: '08:00', enabled: true },
            { id: 'lunch', label: '점심 식단 기록 ', time: '12:00', enabled: true },
            { id: 'dinner', label: '저녁 식단 기록 ', time: '18:00', enabled: true },
        ];
        const saved = localStorage.getItem('caremeal_alarms');
        if (!saved) return defaultAlarms;

        try {
            const parsed = JSON.parse(saved) as AlarmSetting[];
            return defaultAlarms.map(def => {
                const s = parsed.find(p => p.id === def.id);
                // 기존 상태(시간, 활성화 여부)는 유지하되, 텍스트(label)는 코드의 최신본을 사용합니다.
                return s ? { ...s, label: def.label } : def;
            });
        } catch (e) {
            return defaultAlarms;
        }
    });

    useEffect(() => {
        localStorage.setItem('caremeal_alarms', JSON.stringify(alarms));
    }, [alarms]);

    const updateAlarm = (id: string, updates: Partial<AlarmSetting>) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    return (
        <div className="absolute inset-0 bg-[#f8fafc] z-[60] flex flex-col animate-fadeIn overflow-hidden">
            {/* Header */}
            <header className="px-5 pb-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] bg-white border-b border-gray-50 flex items-center sticky top-0 z-30">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400 active:bg-gray-100 rounded-full transition-colors mr-2">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-black text-gray-900">알림 및 안내 설정</h1>
            </header>

            {/* Tabs */}
            <div className="bg-white px-5 pt-2 flex space-x-6 border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('alarm')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'alarm' ? 'text-primary border-primary' : 'text-gray-400 border-transparent'}`}
                >
                    알람 설정
                </button>
                <button
                    onClick={() => setActiveTab('guide')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'guide' ? 'text-primary border-primary' : 'text-gray-400 border-transparent'}`}
                >
                    서비스 안내
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-10">
                {activeTab === 'alarm' ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50/50 p-4 rounded-2xl mb-6">
                            <p className="text-xs text-blue-600 font-bold leading-relaxed flex items-start">
                                <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                                설정하신 시간에 맞춰 식단 기록 및 혈당 관리를 잊지 않도록 푸시 알림을 보내드립니다.
                            </p>
                        </div>

                        {alarms.map((alarm) => (
                            <div key={alarm.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-xl ${alarm.enabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                            <Bell size={20} />
                                        </div>
                                        <span className={`font-bold ${alarm.enabled ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{alarm.label}</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={alarm.enabled}
                                            onChange={(e) => updateAlarm(alarm.id, { enabled: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    <Clock size={16} className="text-gray-400" />
                                    <input
                                        type="time"
                                        value={alarm.time}
                                        onChange={(e) => updateAlarm(alarm.id, { time: e.target.value })}
                                        disabled={!alarm.enabled}
                                        className="bg-transparent border-none outline-none font-black text-gray-900 flex-1 disabled:text-gray-300"
                                    />
                                    <ChevronRight size={14} className="text-gray-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Intro Section */}
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-4 text-primary">
                                <BookOpen size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">CareMeal 가이드</h2>
                            <p className="text-sm text-gray-500">김닥터와 함께 시작하는 건강한 혈당 관리</p>
                        </div>

                        {/* Content Blocks */}
                        <div className="space-y-6">
                            <section>
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="w-2 h-6 bg-primary rounded-full"></div>
                                    <h3 className="font-black text-gray-900 text-lg">프로젝트 소개</h3>
                                </div>
                                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm leading-relaxed text-gray-700 text-sm space-y-3">
                                    <p>
                                        <span className="text-primary font-bold">CareMeal</span>은 만성 질환자와 건강 관리가 필요한 사용자들을 위해 설계된 커스텀 식단 솔루션입니다.
                                    </p>
                                    <p>
                                        개인의 건강 지표와 식습관을 정밀하게 분석하여, 단순히 '무엇을 먹지 말라'는 지시가 아닌 '무엇을 어떻게 먹어야 하는지'에 대한 명쾌한 해답을 제시합니다.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                                    <h3 className="font-black text-gray-900 text-lg">주요 사용 방법</h3>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { title: "정밀 진단", desc: "나의 질환 정보와 신체 데이터를 입력하여 정밀 영양 리포트를 생성하세요.", icon: <CheckCircle2 className="text-primary" /> },
                                        { title: "매일 기록", desc: "매 끼니 식단과 혈당을 기록하면 김닥터 AI가 실시간 피드백을 드립니다.", icon: <CheckCircle2 className="text-primary" /> },
                                        { title: "맞춤 식단", desc: "나의 건강 상태에 딱 맞는 추천 레시피와 맞춤 식단을 매주 제안받으세요.", icon: <CheckCircle2 className="text-primary" /> },
                                        { title: "김닥터 챗", desc: "식단 선택이 고민될 때 언제든지 김닥터에게 질문하고 조언을 받으세요.", icon: <CheckCircle2 className="text-primary" /> },
                                    ].map((item, i) => (
                                        <div key={i} className="bg-white p-5 rounded-3xl border border-gray-50 flex items-start space-x-4 shadow-sm">
                                            <div className="mt-1">{item.icon}</div>
                                            <div>
                                                <h4 className="font-black text-gray-900 text-sm mb-1">{item.title}</h4>
                                                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="bg-gray-900 p-8 rounded-[40px] text-white">
                            <h3 className="text-lg font-black mb-4">건강한 내일을 위해</h3>
                            <p className="text-xs text-white/70 leading-relaxed">
                                오늘의 한 끼가 내일의 건강을 결정합니다. CareMeal은 당신의 든든한 건강 파트너가 되어 끝까지 함께하겠습니다.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
