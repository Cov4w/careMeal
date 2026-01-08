
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, Stethoscope, RefreshCcw, History, Trash2, X, MessageSquare, Camera } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Message, MealItem } from '../types';
import { fetchChatResponse, analyzeFoodImage } from '../services/api';

interface ChatInterfaceProps {
  onBack: () => void;
  initialMessage?: string;
  userId: string;
  onNavigate?: (view: any) => void;
  onSaveMeal: (time: 'breakfast' | 'lunch' | 'dinner', item: MealItem) => void;
}

const INITIAL_GREETING: Message = {
  id: 'init-1',
  text: '안녕하세요, 환자분! CareMeal의 **김닥터**입니다. 👨‍⚕️\n오늘 식단이나 혈당 수치에 대해 궁금한 점이 있으신가요?',
  sender: 'ai',
  timestamp: new Date(),
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack, initialMessage, userId, onNavigate, onSaveMeal }) => {
  useEffect(() => {
    console.log("🐛 ChatInterface mounted. Current UserID prop:", userId);
  }, [userId]);

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('caremeal_chat_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
    return [INITIAL_GREETING];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const initialTriggered = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('caremeal_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    console.log(`🐛 Sending chat request... UserID: ${userId}, Message: ${text}`);

    try {
      const response = await fetchChatResponse({
        user_id: userId,
        user_message: text
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        sender: 'ai',
        timestamp: new Date(),
        sources: response.sources
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to fetch response", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "⚠️ 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, userId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isLoading) return;

    // 1. Show user message with local image preview immediately
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;

      const userMessage: Message = {
        id: Date.now().toString(),
        text: "📸 식단 사진을 업로드했습니다.",
        sender: 'user',
        timestamp: new Date(),
        image: base64Image
      };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // 2. Call Backend API
        console.log(`📸 Analyzing food image... UserID: ${userId}`);
        const response = await analyzeFoodImage(userId, file);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.reply,
          sender: 'ai',
          timestamp: new Date(),
          sources: response.sources,
          isAnalysis: true // Mark as analysis result
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error("Failed to analyze image", error);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: "⚠️ 이미지 분석에 실패했습니다. 다시 시도해주세요.",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialMessage && !initialTriggered.current) {
      initialTriggered.current = true;
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, handleSendMessage]);

  const onSendClick = () => {
    handleSendMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendClick();
    }
  };

  const handleClearAll = () => {
    if (window.confirm("모든 대화 기록을 영구적으로 삭제하시겠습니까?")) {
      setMessages([INITIAL_GREETING]);
      setIsHistoryOpen(false);
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative overflow-hidden">
      {/* Header with Top Safe Area */}
      <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top,12px)+12px)] border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-1 -ml-1 text-gray-600 active:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary mr-2">
              <Stethoscope size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm text-gray-800">김닥터 식단상담</h1>
              <div className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                <span className="text-[10px] text-gray-400">실시간 상담 중</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-gray-400 active:text-primary transition-colors">
            <History size={20} />
          </button>
          <button onClick={handleClearAll} className="p-2 text-gray-400 active:text-rose-500 transition-colors">
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scrolling-touch">
        <div className="max-w-3xl mx-auto space-y-2">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onDelete={() => deleteMessage(msg.id)}
              onNavigate={onNavigate}
              onSaveMeal={onSaveMeal}
            />
          ))}
          {isLoading && (
            <div className="flex w-full mb-6 justify-start">
              <div className="flex max-w-[85%] flex-row">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-primary-light text-white">
                  <Stethoscope size={20} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <div className="max-w-3xl mx-auto flex items-end space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3.5 rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors"
            title="사진 업로드"
          >
            <Camera size={20} />
          </button>
          <div className="flex-1 bg-gray-100 rounded-[24px] border border-transparent focus-within:border-primary focus-within:bg-white focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="궁금한 식단을 물어보세요..."
              className="w-full bg-transparent border-none px-5 py-3.5 text-[15px] focus:outline-none focus:ring-0 rounded-2xl text-gray-800 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={onSendClick}
            disabled={!inputText.trim() || isLoading}
            className={`p-3.5 rounded-full flex-shrink-0 transition-all shadow-sm active:scale-90
              ${(!inputText.trim() || isLoading)
                ? 'bg-gray-200 text-gray-400'
                : 'bg-primary text-white shadow-lg shadow-primary/20'
              }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Slide-out History with Safe Areas */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isHistoryOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsHistoryOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className={`absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pt-[calc(env(safe-area-inset-top,12px)+20px)] p-5 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2">
              <History size={20} className="text-primary" />
              <h2 className="font-bold text-gray-900">지난 대화 기록</h2>
            </div>
            <button onClick={() => setIsHistoryOpen(false)} className="p-2 active:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length <= 1 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-30">
                <MessageSquare size={48} />
                <p className="text-sm mt-2">저장된 대화가 없습니다.</p>
              </div>
            ) : (
              messages.filter(m => m.sender === 'user').map((m) => (
                <div key={m.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 active:border-primary/30 transition-all relative">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">{m.timestamp.toLocaleDateString()}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{m.text}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMessage(m.id); }}
                    className="absolute top-4 right-4 text-gray-300 active:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="p-5 pb-[calc(env(safe-area-inset-bottom,20px)+20px)] border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={handleClearAll}
              className="w-full py-4 flex items-center justify-center space-x-2 bg-white text-rose-500 border border-rose-100 rounded-2xl font-bold text-sm shadow-sm active:bg-rose-50"
            >
              <Trash2 size={18} />
              <span>전체 기록 비우기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
