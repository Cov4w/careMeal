
import React, { useState } from 'react';
import { Activity, ArrowRight, Lock, User, UserPlus, Sparkles, ChevronLeft, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import Diagnosis, { DiagnosisResult } from './Diagnosis';
import { login, signUp } from '../services/api';
import { SignUpRequest } from '../types';

interface LoginProps {
  onLoginComplete: (data: DiagnosisResult) => void;
}

type AuthMode = 'login' | 'signup' | 'welcome' | 'survey';

const Login: React.FC<LoginProps> = ({ onLoginComplete }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Auth States
  const [authData, setAuthData] = useState({
    userId: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // Survey States (to be passed to Diagnosis)
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const isPasswordMatch = authData.password === authData.confirmPassword;
  const isSignupValid = mode === 'signup' && authData.name && authData.userId && authData.password && isPasswordMatch;

  const handleTestLogin = () => {
    // 사용자의 요청대로 당뇨병 환자를 기본 테스트 계정으로 설정
    const testResult: DiagnosisResult = {
      name: '김테스트',
      gender: '남성',
      age: '45',
      height: '178',
      weight: '82',
      conditions: ['당뇨병'], // 당뇨 환자로 고정
      interests: ['체중조절', '피로회복'],
      bmi: 25.9,
      weightStatus: '과체중',
      habitScore: 88,
      prescriptions: ["매일 30분 유산소 운동", "당류 섭취 제한 필요"],
      summary: {},
      diseaseDetails: {
        diabetes: { hbA1c: '6.8', year: '2', medType: '경구제' }
      },
      userId: 'test_user_diabetes' // 테스트용 ID
    };
    onLoginComplete(testResult);
  };

  const handleSurveyComplete = async (result: DiagnosisResult) => {
    try {
      const signupReq: SignUpRequest = {
        user_id: authData.userId,
        password: authData.password,
        name: authData.name,
        age: parseInt(result.age) || 0,
        diabetes_type: result.conditions.length > 0 ? result.conditions.join(', ') : '일반',
        details: result // 모든 상세 데이터 전송
      };

      result.userId = authData.userId; // 결과에 ID 포함
      await signUp(signupReq);
      console.log("🐛 Signup Complete. Passing result to App:", result);
      onLoginComplete(result);
    } catch (error) {
      alert("회원가입 중 오류가 발생했습니다.");
      console.error(error);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      try {
        const response = await login({
          user_id: authData.userId,
          password: authData.password
        });

        if (response.status === 'success' && response.data) {
          // Server data to DiagnosisResult mapping
          const serverData = response.data;
          const loginResult: DiagnosisResult = {
            name: serverData.name,
            gender: serverData.gender || '미정',
            age: String(serverData.age),
            height: serverData.height || '0',
            weight: serverData.weight || '0',
            conditions: serverData.conditions || ['일반'],
            interests: [],
            bmi: serverData.bmi || 0,
            weightStatus: serverData.weightStatus || '보통',
            habitScore: serverData.habitScore || 50,
            prescriptions: [],
            summary: {},
            userId: authData.userId // 결과에 ID 포함
          };
          console.log("🐛 Login Success. Passing result to App:", loginResult);
          onLoginComplete(loginResult);
        }
      } catch (error) {
        alert("로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.");
      }
    } else {
      if (!isPasswordMatch) return;
      setMode('welcome');
    }
  };

  if (mode === 'survey') {
    return (
      <div className="h-full bg-white animate-fadeIn">
        <Diagnosis
          onComplete={handleSurveyComplete}
          onNavigate={() => { }}
          selectedConditions={selectedConditions}
          onConditionsChange={(conditions) => setSelectedConditions(conditions)}
          initialName={authData.name}
        />
      </div>
    );
  }

  if (mode === 'welcome') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-8 text-center animate-fadeIn">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary-dark rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-primary/40 animate-bounce">
            <Sparkles size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">
          환영합니다, {authData.name}님!
        </h1>
        <p className="text-gray-500 mb-12 leading-relaxed font-medium">
          회원가입이 완료되었습니다.<br />
          이제 <strong>AI 김닥터</strong>와 함께하는<br />
          스마트한 식단 관리를 시작해볼까요?
        </p>
        <button
          onClick={() => setMode('survey')}
          className="w-full max-w-xs bg-gray-900 text-white font-bold py-5 rounded-[24px] shadow-xl shadow-gray-200 flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <span>맞춤 진단 시작하기</span>
          <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white p-6 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12 relative animate-fadeIn">
          {mode === 'signup' && (
            <button
              onClick={() => setMode('login')}
              className="absolute -top-4 -left-2 p-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          <div className="mx-auto w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center mb-6">
            <Activity size={36} className="text-primary" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">CareMeal</h1>
          <p className="text-gray-400 text-sm font-semibold tracking-tight">
            {mode === 'login' ? "당신의 식단 주치의, 김닥터" : "새로운 건강 관리의 시작"}
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-5 animate-slideUp">
          {mode === 'signup' && (
            <Input
              label="이름"
              value={authData.name}
              onChange={(v: string) => setAuthData({ ...authData, name: v })}
              placeholder="홍길동"
              icon={<User size={20} />}
            />
          )}
          <Input
            label="아이디"
            value={authData.userId}
            onChange={(v: string) => setAuthData({ ...authData, userId: v })}
            placeholder="아이디를 입력하세요"
            icon={<User size={20} />}
          />
          <Input
            label="비밀번호"
            value={authData.password}
            onChange={(v: string) => setAuthData({ ...authData, password: v })}
            type="password"
            placeholder="비밀번호를 입력하세요"
            icon={<Lock size={20} />}
          />

          {mode === 'signup' && (
            <div className="space-y-2">
              <Input
                label="비밀번호 확인"
                value={authData.confirmPassword}
                onChange={(v: string) => setAuthData({ ...authData, confirmPassword: v })}
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                icon={<Lock size={20} />}
              />
              {authData.confirmPassword && (
                <div className={`flex items-center space-x-1.5 ml-1 pt-1 animate-fadeIn ${isPasswordMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isPasswordMatch ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span className="text-xs font-bold italic">
                    {isPasswordMatch ? '비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={mode === 'signup' && !isSignupValid}
              className={`w-full flex items-center justify-center font-black py-5 rounded-3xl shadow-xl transition-all active:scale-[0.98]
                ${(mode === 'login' || isSignupValid)
                  ? 'bg-primary text-white shadow-primary/25'
                  : 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'}`}
            >
              <span className="text-lg">{mode === 'login' ? '로그인' : '회원가입 완료'}</span>
              <ArrowRight size={22} className="ml-2" />
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={handleTestLogin}
                className="w-full flex items-center justify-center font-bold py-4 rounded-3xl bg-gray-900 text-white shadow-lg active:scale-[0.98] transition-all"
              >
                <Play size={16} className="mr-2 fill-current" />
                <span>테스트 계정으로 즉시 체험</span>
              </button>
            )}
          </div>

          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setAuthData({ userId: '', password: '', confirmPassword: '', name: '' });
              }}
              className="text-sm font-bold text-gray-400 hover:text-primary transition-colors flex items-center justify-center space-x-2 mx-auto"
            >
              <span>{mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}</span>
              <span className="text-primary border-b-2 border-primary/20 pb-0.5">{mode === 'login' ? '회원가입' : '로그인'}</span>
            </button>
          </div>
        </form>

        <div className="mt-16 p-5 bg-gray-50 rounded-3xl border border-gray-100/50 flex items-start space-x-3">
          <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
            CareMeal은 모든 데이터를 암호화하여 보호합니다. 환자님의 건강 기록은 오직 맞춤형 가이드 제공을 위해서만 활용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, icon }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-gray-400 ml-1 tracking-wide uppercase opacity-70">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-primary transition-colors">
        {icon}
      </div>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-6 py-4.5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-[15px] font-bold text-gray-800 placeholder-gray-300 outline-none shadow-sm"
        placeholder={placeholder}
      />
    </div>
  </div>
);

export default Login;
