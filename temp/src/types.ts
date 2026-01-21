export interface User {
  id: string;
  name: string;
}

export type Sender = 'user' | 'ai';

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  sources?: string[];
  image?: string; // Base64 or URL
  isAnalysis?: boolean; // 식단 분석 결과 여부
}

export interface ChatRequest {
  user_id: string;
  user_message: string;
}

export interface ChatResponse {
  reply: string;
  sources?: string[];
}

export interface SignUpRequest {
  user_id: string;
  password: string;
  name: string;
  age: number;
  diabetes_type: string;
  details?: any; // 상세 진단 정보
}

export interface LoginRequest {
  user_id: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  data?: any; // Using any for flexibility with DiagnosisResult
}

// 식단 기록용 데이터 구조
export interface NutritionInfo {
  calories: number;
  carbs: number; // g
  protein: number; // g
  fat: number; // g
}

export interface MealItem {
  menu: string;
  nutrition: NutritionInfo;
  image?: string; // Base64 (Thumbnail) or URL
}

export interface DailyMealPlan {
  breakfast?: MealItem;
  lunch?: MealItem;
  dinner?: MealItem;
}
