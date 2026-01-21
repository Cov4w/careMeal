import axios from 'axios';
import { ChatRequest, ChatResponse, SignUpRequest, LoginRequest, LoginResponse } from '@/types';
import { mockChatApi } from './mockApi';

// Real Backend URL
const API_BASE_URL = 'http://localhost:8000';

export const fetchChatResponse = async (req: ChatRequest): Promise<ChatResponse> => {
  try {
    // 1. Attempt to connect to real backend
    // Timeout set to 3s to quickly fallback if server is unresponsive
    const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat`, req, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // Bedrock RAG 응답 대기 시간 충분히 확보 (3초 -> 30초)
    });

    return response.data;
  } catch (error) {
    // 2. Fallback Handler
    // If Backend fails (CORS, Network Error, Server Down), switch to Mock API
    console.warn("⚠️ Backend connection failed. Automatically switching to Mock API mode.", error);

    // Return mock response so the user experience is uninterrupted
    return await mockChatApi(req);
  }
};

export const signUp = async (req: SignUpRequest): Promise<{ status: string, message: string }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/signup`, req);
    return response.data;
  } catch (error) {
    console.error("Signup failed", error);
    throw error;
  }
};

export const login = async (req: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await axios.post<LoginResponse>(`${API_BASE_URL}/login`, req);
    return response.data;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const analyzeFoodImage = async (userId: string, imageFile: File): Promise<ChatResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('user_id', userId);

    const response = await axios.post(`${API_BASE_URL}/analyze-food`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 이미지 분석 및 RAG 처리 시간 고려
    });

    // Backend returns { reply: string, raw_analysis: string, status: string }
    // We map it to ChatResponse format
    return {
      reply: response.data.reply,
      sources: ["이미지 분석 결과"]
    };
  } catch (error) {
    console.warn("Image analysis failed", error);
    throw error;
  }
};