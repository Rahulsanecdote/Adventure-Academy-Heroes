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
  outfit_color?: string;
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

// Phase 1: server-validated Math Challenge
export interface ChallengeQuestion {
  prompt: string;
  operation: string;
}

export interface ChallengeStart {
  challenge_id: string;
  quest_id: string;
  total_questions: number;
  questions: ChallengeQuestion[];
}

export interface ChallengeResult {
  challenge_id: string;
  quest_id: string;
  correct_count: number;
  total_questions: number;
  passed: boolean;
  already_completed?: boolean;
  reward?: RewardCeremony | null;
}

export interface SkillEvidence {
  quest_id: string;
  quest_title: string;
  attempts: number;
  total_questions: number;
  total_correct: number;
  last_played?: string;
  passed: boolean;
}

// Phase 3: Trick Academy — the parent evidence endpoint now returns a
// report wrapping quest evidence + per-technique mastery arcs.
export interface TechniqueEvidence {
  technique_id: string;
  technique_name: string;
  icon: string;
  attempts: number;
  total_questions: number;
  total_correct: number;
  best_correct: number;
  best_total: number;
  passed: boolean;
  mastered: boolean;
  mastered_at?: string;
  last_played?: string;
  dare?: {
    attempted: boolean;
    answer_correct: boolean;
    prediction?: number;
  } | null;
  teach_back: { completed: boolean; attempts: number };
  encores: {
    offset_days: number;
    status: string;
    correct_count?: number | null;
    total_questions?: number | null;
    attempts: number;
  }[];
}

export interface SkillEvidenceReport {
  quests: SkillEvidence[];
  techniques: TechniqueEvidence[];
}

// Phase 3: Trick Academy ("The Trick Academy Ascent")
export interface TrickTechnique {
  id: string;
  order: number;
  name: string;
  icon: string;
  tagline: string;
  badge: { id: string; name: string; icon: string };
  xp_reward: number;
  coin_reward: number;
  status: 'locked' | 'available' | 'in_progress' | 'mastered';
  mastered_at?: string;
}

export interface TrickStep {
  key: string;
  label: string;
  kind: 'value' | 'choice';
  options?: { label: string; parts: number[] }[];
  hint?: string;
}

export interface TrickProblem {
  prompt: string;
  operation: string;
  steps?: TrickStep[];
  skin?: string | null;
  mixed_technique?: string | null;
}

export interface TrickDare {
  prompt: string;
  operation: string;
  dare_line: string;
  prediction_options: string[];
}

export interface TrickSessionStart {
  session_id: string;
  technique_id: string;
  stage: string;
  dare: TrickDare;
}

export interface TrickReveal {
  prompt: string;
  answer: number;
  performance: { name: string; text: string }[];
  visual?: Record<string, any> | null;
}

export interface TrickDareResult {
  answer_correct: boolean;
  correct_answer: number;
  prediction: number;
  stage: string;
  reveal: TrickReveal;
}

export interface TrickStepResult {
  key: string;
  correct: boolean;
  expected: number;
}

export interface TrickWhyLab {
  why_text: string;
  explorer_visual?: Record<string, any> | null;
  probe: {
    instruction: string;
    given: Record<string, any>;
    input_labels: string[];
  };
}

export interface TrickMimicResult {
  step_results: TrickStepResult[];
  complete: boolean;
  stage: string;
  why_lab?: TrickWhyLab | null;
}

export interface TrickRep {
  rep_id: string;
  mode: 'along' | 'solo';
  scaffold: 'full' | 'steps_only' | 'none';
  guide_demo?: {
    prompt: string;
    steps: { label: string; value: number }[];
    answer: number;
  } | null;
  problem: TrickProblem;
  consecutive_solo_correct: number;
  solo_streak_needed: number;
}

export interface TrickRepResult {
  mode: string;
  correct: boolean;
  step_results?: TrickStepResult[] | null;
  correct_answer?: number | null;
  consecutive_solo_correct: number;
  gate_passed: boolean;
  stage: string;
}

export interface TrickRemixStart {
  problems: TrickProblem[];
  total: number;
}

export interface TrickSetResult {
  correct_count: number;
  total_questions: number;
  passed: boolean;
  per_problem?: boolean[];
  stage: string;
}

export interface TrickBossStart {
  problems: TrickProblem[];
  total_questions: number;
  time_limit_seconds: number;
  boss_name: string;
  taunt: string;
}

export interface TrickBossResult {
  correct_count: number;
  total_questions: number;
  passed: boolean;
  elapsed_seconds: number;
  time_limit_seconds: number;
  already_mastered: boolean;
  iteration_line?: string | null;
  reward?: RewardCeremony | null;
  stage: string;
}

export interface TrickTeachBack {
  technique_id: string;
  steps: { id: string; label: string }[];
  why_choices: string[];
  completed: boolean;
}

export interface TrickTeachBackResult {
  order_correct: boolean;
  why_correct: boolean;
  completed: boolean;
  attempts: number;
}

export interface TrickEncore {
  id: string;
  technique_id: string;
  technique_name: string;
  icon: string;
  offset_days: number;
  due_at: string;
  is_due: boolean;
  status: string;
  attempts: number;
  correct_count?: number | null;
  total_questions?: number | null;
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