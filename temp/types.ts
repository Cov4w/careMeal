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
