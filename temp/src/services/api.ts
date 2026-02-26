import axios, { AxiosRequestConfig } from 'axios';
import { ChatRequest, ChatResponse, SignUpRequest, LoginRequest, LoginResponse } from '@/types';
import { mockChatApi } from './mockApi';

// Real Backend URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// 토큰 관리
const TOKEN_KEY = 'caremeal_access_token';

export const setAccessToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// 세션 만료 시 자동 로그아웃 처리
const handleSessionExpired = () => {
  console.warn("⚠️ Session expired. Logging out...");
  clearAccessToken();
  localStorage.removeItem('caremeal_logged_in');
  localStorage.removeItem('caremeal_diagnosis_data');
  localStorage.removeItem('caremeal_selected_conditions');
  localStorage.removeItem('userId');
  // 페이지 새로고침으로 로그인 화면으로 이동
  window.location.reload();
};

// Axios 인터셉터: 401 에러 시 자동 로그아웃
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 로그인 API 호출 중 401은 정상적인 인증 실패이므로 제외
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        handleSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

// 인증 헤더 생성
const getAuthHeaders = (): AxiosRequestConfig['headers'] => {
  const token = getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const fetchChatResponse = async (req: ChatRequest): Promise<ChatResponse> => {
  try {
    const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat`, req, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.warn("⚠️ Backend connection failed. Automatically switching to Mock API mode.", error);
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
    // 토큰 저장
    if (response.data.access_token) {
      setAccessToken(response.data.access_token);
    }
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
        ...getAuthHeaders(),
      },
      timeout: 60000,
    });

    return {
      reply: response.data.reply,
      sources: ["이미지 분석 결과"]
    };
  } catch (error) {
    console.warn("Image analysis failed", error);
    throw error;
  }
};

// Meal record types
export interface MealRecordData {
  user_id: string;
  date: string;
  meals?: {
    breakfast?: {
      menu: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };
    lunch?: {
      menu: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };
    dinner?: {
      menu: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };
    snack?: {
      menu: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };
    lateNightSnack?: {
      menu: string;
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };
  };
  blood_sugar?: {
    fasting?: number;
    post_breakfast?: number;  // 백엔드 필드명과 일치
    post_lunch?: number;
    post_dinner?: number;
    // 호환성 (클라이언트가 camelCase 전송 가능)
    postBreakfast?: number;
    postLunch?: number;
    postDinner?: number;
  };
}

export const fetchMealRecord = async (userId: string, date: string): Promise<MealRecordData | null> => {
  try {
    const response = await axios.get<MealRecordData>(`${API_BASE_URL}/records/${userId}`, {
      params: { date },
      headers: getAuthHeaders(),
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error("Failed to fetch meal record", error);
    throw error;
  }
};

export const saveMealRecord = async (data: MealRecordData): Promise<{ status: string }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/records`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to save meal record", error);
    throw error;
  }
};

interface NutritionInfo {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export const estimateNutrition = async (menuName: string): Promise<NutritionInfo> => {
  try {
    const response = await axios.post<NutritionInfo>(`${API_BASE_URL}/estimate-nutrition`, {
      menu_name: menuName,
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to estimate nutrition", error);
    throw error;
  }
};

// --- Recipe Recommendation API ---

export interface Recipe {
  id: number;
  name: string;
  description: string;
  image_url: string;
  disease_tag: string;
  category: string;
  diet_type: string;
  ingredients: string;
  instructions?: string; // [New]
  time_minutes: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sodium: number;
  is_liked?: boolean; // [New]
}

interface RecommendationResponse {
  user_condition: string;
  recommendations: Recipe[];
}

export const fetchRecommendedRecipes = async (userId: string): Promise<RecommendationResponse> => {
  try {
    const response = await axios.get<RecommendationResponse>(`${API_BASE_URL}/recipes/recommendations/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch recommended recipes", error);
    return { user_condition: '', recommendations: [] };
  }
};

export const saveUserPreference = async (userId: string, recipeId: number, preference: 'like' | 'dislike') => {
  try {
    await axios.post(`${API_BASE_URL}/user/preference`, {
      user_id: userId,
      recipe_id: recipeId,
      preference: preference
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    console.log(`Preference saved: ${preference}`);
  } catch (error) {
    console.error("Failed to save preference", error);
  }
};

// --- Body Composition API ---

export interface BodyCompositionData {
  id?: number;
  measured_at?: string;
  weight: number;
  impedance: number;
  heart_rate?: number;
  bmi?: number;
  body_fat_percentage?: number;
  water_percentage?: number;
  bone_mass?: number;
  muscle_mass?: number;
  visceral_fat?: number;
  bmr?: number;
  metabolic_age?: number;
  protein_percentage?: number;
  body_type?: string;
  ideal_weight?: number;
  fat_mass?: number;
  fat_free_mass?: number;
  body_score?: number;
}

export interface BodyCompositionHistoryItem {
  id: number;
  measured_at: string;
  weight: number;
  impedance?: number;
  heart_rate?: number;
  bmi: number;
  body_fat_percentage: number;
  water_percentage?: number;
  bone_mass?: number;
  muscle_mass: number;
  visceral_fat?: number;
  bmr?: number;
  metabolic_age?: number;
  protein_percentage?: number;
  body_type?: string;
  ideal_weight?: number;
  fat_mass?: number;
  fat_free_mass?: number;
  body_score: number;
}

export interface BodyCompositionStatsData {
  date: string;
  weight: number;
  body_fat_percentage: number;
  muscle_mass: number;
  bmi: number;
  body_score: number;
}

export interface BodyCompositionStatsResponse {
  status: string;
  period: string;
  record_count: number;
  changes: {
    weight: number;
    body_fat: number;
    muscle_mass: number;
  };
  data: BodyCompositionStatsData[];
}

export const saveBodyComposition = async (data: { weight: number; impedance: number; heart_rate?: number }): Promise<BodyCompositionData> => {
  try {
    const response = await axios.post<BodyCompositionData>(`${API_BASE_URL}/api/body-composition`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to save body composition", error);
    throw error;
  }
};

export const fetchLatestBodyComposition = async (): Promise<BodyCompositionData | null> => {
  try {
    const response = await axios.get<BodyCompositionData & { status: string }>(`${API_BASE_URL}/api/body-composition/latest`, {
      headers: getAuthHeaders(),
      timeout: 5000,
    });
    if (response.data.status === 'no_data') {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error("Failed to fetch latest body composition", error);
    return null;
  }
};

export const fetchBodyCompositionHistory = async (page: number = 1, limit: number = 10): Promise<{
  total: number;
  page: number;
  total_pages: number;
  data: BodyCompositionHistoryItem[];
}> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/body-composition/history`, {
      params: { page, limit },
      headers: getAuthHeaders(),
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch body composition history", error);
    return { total: 0, page: 1, total_pages: 0, data: [] };
  }
};

export const fetchBodyCompositionStats = async (period: string = '1month'): Promise<BodyCompositionStatsResponse | null> => {
  try {
    const response = await axios.get<BodyCompositionStatsResponse>(`${API_BASE_URL}/api/body-composition/stats`, {
      params: { period },
      headers: getAuthHeaders(),
      timeout: 5000,
    });
    if (response.data.status === 'no_data') {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error("Failed to fetch body composition stats", error);
    return null;
  }
};

// --- Scale Bridge API ---

export interface ScaleSessionStatus {
  session_id: string;
  status: 'starting' | 'scanning' | 'measuring' | 'saving' | 'complete' | 'error';
  message: string;
  remaining_seconds: number;
  weight?: number;
  impedance?: number;
  heart_rate?: number;
  bmi?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  body_score?: number;
  error?: string;
  timestamp?: string;
}

export const startScaleMeasurement = async (duration: number = 60): Promise<{ session_id: string } | null> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/scale/start`, {
      duration
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to start scale measurement", error);
    return null;
  }
};

export const getScaleStatus = async (sessionId: string): Promise<ScaleSessionStatus | null> => {
  try {
    const response = await axios.get<ScaleSessionStatus>(`${API_BASE_URL}/api/scale/status/${sessionId}`, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to get scale status", error);
    return null;
  }
};

export const deleteScaleSession = async (sessionId: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/scale/session/${sessionId}`);
  } catch (error) {
    console.error("Failed to delete scale session", error);
  }
};