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
  ChildStats,
  AvatarCustomization,
  ChallengeStart,
  ChallengeResult,
  SkillEvidenceReport,
  TrickTechnique,
  TrickSessionStart,
  TrickDareResult,
  TrickProblem,
  TrickMimicResult,
  TrickWhyLab,
  TrickRep,
  TrickRepResult,
  TrickRemixStart,
  TrickSetResult,
  TrickBossStart,
  TrickBossResult,
  TrickTeachBack,
  TrickTeachBackResult,
  TrickEncore
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
    avatar?: AvatarCustomization;
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

// Challenges APIs (Phase 1: server-validated Math Challenge)
export const challengesAPI = {
  start: async (childId: string, questId: string): Promise<ChallengeStart> => {
    const response = await api.post<ChallengeStart>('/api/challenges/start', {
      child_id: childId,
      quest_id: questId,
    });
    return response.data;
  },

  submit: async (challengeId: string, answers: number[]): Promise<ChallengeResult> => {
    const response = await api.post<ChallengeResult>(`/api/challenges/${challengeId}/submit`, {
      answers,
    });
    return response.data;
  },

  getEvidence: async (childId: string): Promise<SkillEvidenceReport> => {
    const response = await api.get<SkillEvidenceReport>(`/api/challenges/child/${childId}/evidence`);
    return response.data;
  },
};

// Trick Academy APIs (Phase 3: The Trick Academy Ascent — 7 stages)
export const trickAcademyAPI = {
  listTechniques: async (childId: string): Promise<TrickTechnique[]> => {
    const response = await api.get<TrickTechnique[]>('/api/trick-academy/techniques', {
      params: { child_id: childId },
    });
    return response.data;
  },

  startSession: async (childId: string, techniqueId: string): Promise<TrickSessionStart> => {
    const response = await api.post<TrickSessionStart>('/api/trick-academy/sessions', {
      child_id: childId,
      technique_id: techniqueId,
    });
    return response.data;
  },

  submitDare: async (sessionId: string, answer: number, prediction: number | null): Promise<TrickDareResult> => {
    const response = await api.post<TrickDareResult>(`/api/trick-academy/sessions/${sessionId}/dare`, {
      answer,
      prediction,
    });
    return response.data;
  },

  startMimic: async (sessionId: string): Promise<{ problem: TrickProblem }> => {
    const response = await api.post<{ problem: TrickProblem }>(
      `/api/trick-academy/sessions/${sessionId}/reveal/mimic`, {}
    );
    return response.data;
  },

  submitMimic: async (sessionId: string, stepAnswers: number[]): Promise<TrickMimicResult> => {
    const response = await api.post<TrickMimicResult>(
      `/api/trick-academy/sessions/${sessionId}/reveal/mimic/submit`,
      { step_answers: stepAnswers }
    );
    return response.data;
  },

  getWhyLab: async (sessionId: string): Promise<TrickWhyLab> => {
    const response = await api.get<TrickWhyLab>(`/api/trick-academy/sessions/${sessionId}/why`);
    return response.data;
  },

  submitProbe: async (sessionId: string, values: number[]): Promise<{ correct: boolean; hint?: string | null; stage: string }> => {
    const response = await api.post(`/api/trick-academy/sessions/${sessionId}/why/submit`, { values });
    return response.data;
  },

  nextRep: async (sessionId: string, wantDemo = false): Promise<TrickRep> => {
    const response = await api.post<TrickRep>(`/api/trick-academy/sessions/${sessionId}/side-by-side/next`, {
      want_demo: wantDemo,
    });
    return response.data;
  },

  submitRep: async (
    sessionId: string,
    repId: string,
    payload: { step_answers?: number[]; answer?: number }
  ): Promise<TrickRepResult> => {
    const response = await api.post<TrickRepResult>(
      `/api/trick-academy/sessions/${sessionId}/side-by-side/submit`,
      { rep_id: repId, ...payload }
    );
    return response.data;
  },

  startRemix: async (sessionId: string): Promise<TrickRemixStart> => {
    const response = await api.post<TrickRemixStart>(`/api/trick-academy/sessions/${sessionId}/remix/start`, {});
    return response.data;
  },

  submitRemix: async (sessionId: string, answers: number[]): Promise<TrickSetResult> => {
    const response = await api.post<TrickSetResult>(`/api/trick-academy/sessions/${sessionId}/remix/submit`, {
      answers,
    });
    return response.data;
  },

  startBoss: async (sessionId: string): Promise<TrickBossStart> => {
    const response = await api.post<TrickBossStart>(`/api/trick-academy/sessions/${sessionId}/boss/start`, {});
    return response.data;
  },

  submitBoss: async (sessionId: string, answers: number[]): Promise<TrickBossResult> => {
    const response = await api.post<TrickBossResult>(`/api/trick-academy/sessions/${sessionId}/boss/submit`, {
      answers,
    });
    return response.data;
  },

  getTeachBack: async (childId: string, techniqueId: string): Promise<TrickTeachBack> => {
    const response = await api.get<TrickTeachBack>(
      `/api/trick-academy/child/${childId}/teach-back/${techniqueId}`
    );
    return response.data;
  },

  submitTeachBack: async (
    childId: string,
    techniqueId: string,
    order: string[],
    whyIndex: number
  ): Promise<TrickTeachBackResult> => {
    const response = await api.post<TrickTeachBackResult>('/api/trick-academy/teach-back/submit', {
      child_id: childId,
      technique_id: techniqueId,
      order,
      why_index: whyIndex,
    });
    return response.data;
  },

  listEncores: async (childId: string): Promise<TrickEncore[]> => {
    const response = await api.get<TrickEncore[]>(`/api/trick-academy/child/${childId}/encores`);
    return response.data;
  },

  startEncore: async (encoreId: string): Promise<{ encore_id: string; problems: TrickProblem[]; total_questions: number }> => {
    const response = await api.post(`/api/trick-academy/encores/${encoreId}/start`, {});
    return response.data;
  },

  submitEncore: async (encoreId: string, answers: number[]): Promise<{ correct_count: number; total_questions: number; passed: boolean; status: string }> => {
    const response = await api.post(`/api/trick-academy/encores/${encoreId}/submit`, { answers });
    return response.data;
  },
};

// Multiplayer APIs (Phase 2: game-session tokens for the Colyseus server)
export interface GameSession {
  token: string;
  token_type: string;
  expires_in: number;
  child_id: string;
  display_name: string;
  age_band: string;
  avatar: AvatarCustomization;
}

export const multiplayerAPI = {
  sessionToken: async (childId: string): Promise<GameSession> => {
    // Longer timeout than the global 15s: this call crosses the
    // database-backed API, whose slow path can take most of 15s; with
    // the global timeout a merely-slow (not failed) call aborted the
    // whole multiplayer connect. HubWorld also retries the connect.
    const response = await api.post<GameSession>(
      '/api/multiplayer/session-token',
      { child_id: childId },
      { timeout: 30000 }
    );
    return response.data;
  },
};

export default api;
