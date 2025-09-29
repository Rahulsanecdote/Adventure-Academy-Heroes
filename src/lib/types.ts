export const difficultyLevels = [
  "Very Easy",
  "Easy",
  "Medium",
  "Hard",
  "Very Hard",
] as const;

export type Difficulty = (typeof difficultyLevels)[number];

// Daily Quests & Challenges Types
export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  target: number;
  current: number;
  reward: {
    xp: number;
    treasures: number;
    badge?: string;
  };
  expiresAt: Date;
  completed: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  requirements: string[];
  reward: {
    xp: number;
    treasures: number;
    badge?: string;
  };
  timeLimit?: number; // in minutes
  completed: boolean;
}

// Subject-Specific Content Types
export const subjects = [
  "Mathematics",
  "Science",
  "History",
  "Language Arts",
  "Geography",
  "Art",
] as const;

export type Subject = (typeof subjects)[number];

export interface SubjectWorld {
  id: string;
  name: Subject;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress: number; // 0-100
  activities: Activity[];
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  difficulty: Difficulty;
  type: 'quiz' | 'puzzle' | 'story' | 'challenge';
  xpReward: number;
  treasureReward: number;
  completed: boolean;
  locked: boolean;
}

// User Progress Types
export interface UserProgress {
  level: number;
  xp: number;
  hp: number;
  treasures: number;
  earnedBadges: string[];
  completedQuests: string[];
  completedChallenges: string[];
  subjectProgress: Record<Subject, number>;
  lastLoginDate: string;
}
