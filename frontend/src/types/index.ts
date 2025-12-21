export interface User {
  id: string;
  email: string;
  role: 'parent' | 'admin';
  created_at: string;
  consent_timestamp?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AvatarCustomization {
  skin_tone: string;
  hair_style: string;
  hair_color: string;
  outfit: string;
  accessory?: string;
}

export interface ChildProfile {
  id: string;
  parent_id: string;
  username: string;
  age_band: '7-8' | '9-10' | '11-12';
  avatar: AvatarCustomization;
  created_at: string;
  total_xp: number;
  level: number;
  coins: number;
  hint_buddy_enabled: boolean;
}

export interface ChildSession {
  child_id: string;
  parent_id: string;
  username: string;
  access_token: string;
  token_type: string;
}

export type QuestStepType = 'math_puzzle' | 'code_puzzle' | 'science_sim' | 'dialogue' | 'collect';

export interface QuestStep {
  id: string;
  quest_id: string;
  step_order: number;
  step_type: QuestStepType;
  title: string;
  description: string;
  config: Record<string, any>;
  hints: string[];
  xp_reward: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  world: 'math_jungle' | 'code_city' | 'science_spaceport';
  subject: 'math' | 'coding' | 'science';
  difficulty: 'easy' | 'medium' | 'hard';
  age_range: string[];
  estimated_minutes: number;
  xp_reward: number;
  coin_reward: number;
  badge_id?: string;
  prerequisites: string[];
  created_at: string;
  created_by: string;
  is_active: boolean;
  steps: QuestStep[];
}

export interface QuestWithProgress extends Quest {
  progress?: QuestProgress;
  is_completed: boolean;
  is_locked: boolean;
}

export interface StepProgress {
  step_id: string;
  completed: boolean;
  attempts: number;
  completed_at?: string;
  score?: number;
}

export interface QuestProgress {
  id: string;
  child_id: string;
  quest_id: string;
  started_at: string;
  completed_at?: string;
  current_step_index: number;
  steps_progress: StepProgress[];
  total_attempts: number;
  hints_used: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'math' | 'coding' | 'science' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface Cosmetic {
  id: string;
  name: string;
  category: 'hair_style' | 'hair_color' | 'outfit' | 'accessory' | 'skin_tone';
  value: string;
  description: string;
  unlock_requirement: string;
  coin_cost: number;
  image_url?: string;
  created_at: string;
}

export interface RewardCeremony {
  quest_title: string;
  xp_earned: number;
  coins_earned: number;
  badges: Badge[];
  cosmetics: Cosmetic[];
  new_level?: number;
  total_xp: number;
  total_coins: number;
}

export interface ChildStats {
  child_id: string;
  total_xp: number;
  level: number;
  coins: number;
  quests_completed: number;
  quests_in_progress: number;
  stats_by_subject: {
    math: number;
    coding: number;
    science: number;
  };
}