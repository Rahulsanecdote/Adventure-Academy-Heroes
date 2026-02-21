import axios, { AxiosError } from 'axios';
import type {
  AuthResponse,
  User,
  ChildProfile,
  ChildSession,
  Quest,
  QuestWithProgress,
  QuestProgress,
  RewardCeremony,
  ChildStats
} from '../types';

// API URL resolution strategy:
// 1. explicit env override wins
// 2. in Vite dev, use relative URLs and rely on dev server proxy (/api -> backend)
// 3. otherwise use relative URLs (for deployments that route /api to backend)
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl;

  return '';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor - always attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Debug log in dev
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    // Log error details for debugging
    console.error(`[API Error] ${status} on ${url}:`, error.response?.data || error.message);
    
    // Handle 401 - redirect to login
    if (status === 401) {
      console.warn('[API] Unauthorized - clearing token and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('activeChildId');
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/signup', {
      email,
      password,
      role: 'parent',
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
    // Store token on successful login
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/api/auth/me');
    return response.data;
  },

  createChildSession: async (childId: string): Promise<ChildSession> => {
    const response = await api.post<ChildSession>(`/api/auth/child-session/${childId}`);
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeChildId');
  },
};

// Children APIs
export const childrenAPI = {
  create: async (data: {
    parent_id: string;
    username: string;
    age_band: string;
  }): Promise<ChildProfile> => {
    const response = await api.post<ChildProfile>('/api/children', data);
    return response.data;
  },

  getAll: async (): Promise<ChildProfile[]> => {
    const response = await api.get<ChildProfile[]>('/api/children');
    return response.data;
  },

  getOne: async (childId: string): Promise<ChildProfile> => {
    if (!childId || childId === 'undefined') {
      throw new Error('Invalid childId: cannot fetch child profile');
    }
    const response = await api.get<ChildProfile>(`/api/children/${childId}`);
    return response.data;
  },

  updateAvatar: async (childId: string, avatar: unknown): Promise<ChildProfile> => {
    const response = await api.patch<ChildProfile>(`/api/children/${childId}/avatar`, avatar);
    return response.data;
  },

  toggleHintBuddy: async (childId: string, enabled: boolean): Promise<ChildProfile> => {
    const response = await api.patch<ChildProfile>(
      `/api/children/${childId}/hint-buddy?enabled=${enabled}`
    );
    return response.data;
  },

  delete: async (childId: string): Promise<void> => {
    await api.delete(`/api/children/${childId}`);
  },
};

// Quests APIs
export const questsAPI = {
  getAll: async (filters?: {
    world?: string;
    subject?: string;
    difficulty?: string;
  }): Promise<Quest[]> => {
    const response = await api.get<Quest[]>('/api/quests', { params: filters });
    return response.data;
  },

  getForChild: async (childId: string, world?: string): Promise<QuestWithProgress[]> => {
    if (!childId || childId === 'undefined') {
      throw new Error('Invalid childId: cannot fetch quests');
    }
    const response = await api.get<QuestWithProgress[]>(
      `/api/quests/child/${childId}`,
      { params: { world } }
    );
    return response.data;
  },

  getOne: async (questId: string): Promise<Quest> => {
    const response = await api.get<Quest>(`/api/quests/${questId}`);
    return response.data;
  },
};

// Progress APIs
export const progressAPI = {
  startQuest: async (childId: string, questId: string): Promise<QuestProgress> => {
    const response = await api.post<QuestProgress>('/api/progress/start-quest', {
      child_id: childId,
      quest_id: questId,
    });
    return response.data;
  },

  updateProgress: async (progressId: string, data: unknown): Promise<QuestProgress> => {
    const response = await api.patch<QuestProgress>(`/api/progress/${progressId}`, data);
    return response.data;
  },

  completeQuest: async (progressId: string): Promise<RewardCeremony> => {
    const response = await api.post<RewardCeremony>(`/api/progress/complete-quest/${progressId}`);
    return response.data;
  },

  getChildProgress: async (childId: string): Promise<QuestProgress[]> => {
    const response = await api.get<QuestProgress[]>(`/api/progress/child/${childId}`);
    return response.data;
  },

  getChildStats: async (childId: string): Promise<ChildStats> => {
    if (!childId || childId === 'undefined') {
      throw new Error('Invalid childId: cannot fetch stats');
    }
    const response = await api.get<ChildStats>(`/api/progress/child/${childId}/stats`);
    return response.data;
  },
};

export default api;
