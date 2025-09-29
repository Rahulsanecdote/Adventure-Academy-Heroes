import { Quest, Challenge, Difficulty } from './types';

// Daily Quest Templates
const DAILY_QUEST_TEMPLATES = [
  {
    id: 'complete_obstacles',
    title: 'Obstacle Master',
    description: 'Complete {target} obstacle courses',
    type: 'daily' as const,
    target: 3,
    reward: { xp: 100, treasures: 10 }
  },
  {
    id: 'earn_xp',
    title: 'Experience Seeker',
    description: 'Earn {target} XP points',
    type: 'daily' as const,
    target: 200,
    reward: { xp: 50, treasures: 15 }
  },
  {
    id: 'voice_activity',
    title: 'Voice Champion',
    description: 'Complete {target} voice activities',
    type: 'daily' as const,
    target: 2,
    reward: { xp: 75, treasures: 8 }
  },
  {
    id: 'story_lines',
    title: 'Story Weaver',
    description: 'Add {target} lines to stories',
    type: 'daily' as const,
    target: 5,
    reward: { xp: 80, treasures: 12 }
  }
];

// Weekly Quest Templates
const WEEKLY_QUEST_TEMPLATES = [
  {
    id: 'level_up',
    title: 'Level Climber',
    description: 'Gain {target} levels',
    type: 'weekly' as const,
    target: 2,
    reward: { xp: 500, treasures: 50, badge: 'Weekly Warrior' }
  },
  {
    id: 'treasure_collector',
    title: 'Treasure Hunter',
    description: 'Collect {target} treasures',
    type: 'weekly' as const,
    target: 100,
    reward: { xp: 300, treasures: 25, badge: 'Treasure Master' }
  }
];

// Challenge Templates
const CHALLENGE_TEMPLATES = [
  {
    id: 'speed_run',
    title: 'Speed Runner',
    description: 'Complete an obstacle course in under 30 seconds',
    difficulty: 'Medium' as Difficulty,
    requirements: ['Complete obstacle course', 'Time under 30 seconds'],
    reward: { xp: 200, treasures: 30, badge: 'Speed Demon' },
    timeLimit: 5
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Complete an obstacle course without losing any HP',
    difficulty: 'Hard' as Difficulty,
    requirements: ['Complete obstacle course', 'Maintain 100% HP'],
    reward: { xp: 300, treasures: 40, badge: 'Perfect Hero' }
  },
  {
    id: 'story_marathon',
    title: 'Story Marathon',
    description: 'Create a story with at least 20 lines',
    difficulty: 'Easy' as Difficulty,
    requirements: ['Use Skit Weaver', 'Add 20+ story lines'],
    reward: { xp: 150, treasures: 20, badge: 'Storyteller' }
  }
];

export function generateDailyQuests(): Quest[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Generate 3 random daily quests
  const shuffled = [...DAILY_QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  return selected.map((template, index) => ({
    id: `${template.id}_${today.toISOString().split('T')[0]}`,
    title: template.title,
    description: template.description.replace('{target}', template.target.toString()),
    type: template.type,
    target: template.target,
    current: 0,
    reward: template.reward,
    expiresAt: tomorrow,
    completed: false
  }));
}

export function generateWeeklyQuests(): Quest[] {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  // Generate 2 weekly quests
  return WEEKLY_QUEST_TEMPLATES.map((template, index) => ({
    id: `${template.id}_week_${getWeekNumber(today)}`,
    title: template.title,
    description: template.description.replace('{target}', template.target.toString()),
    type: template.type,
    target: template.target,
    current: 0,
    reward: template.reward,
    expiresAt: nextWeek,
    completed: false
  }));
}

export function generateChallenges(): Challenge[] {
  return CHALLENGE_TEMPLATES.map(template => ({
    id: template.id,
    title: template.title,
    description: template.description,
    difficulty: template.difficulty,
    requirements: template.requirements,
    reward: template.reward,
    timeLimit: template.timeLimit,
    completed: false
  }));
}

export function updateQuestProgress(quests: Quest[], questId: string, increment: number = 1): Quest[] {
  return quests.map(quest => {
    if (quest.id.startsWith(questId.split('_')[0]) && !quest.completed) {
      const newCurrent = Math.min(quest.current + increment, quest.target);
      return {
        ...quest,
        current: newCurrent,
        completed: newCurrent >= quest.target
      };
    }
    return quest;
  });
}

export function getActiveQuests(): Quest[] {
  const stored = localStorage.getItem('activeQuests');
  if (!stored) {
    const newQuests = [...generateDailyQuests(), ...generateWeeklyQuests()];
    localStorage.setItem('activeQuests', JSON.stringify(newQuests));
    return newQuests;
  }

  const quests: Quest[] = JSON.parse(stored);
  const now = new Date();
  
  // Filter out expired quests
  const activeQuests = quests.filter(quest => new Date(quest.expiresAt) > now);
  
  // If no daily quests exist, generate new ones
  const hasDailyQuests = activeQuests.some(quest => quest.type === 'daily');
  if (!hasDailyQuests) {
    const newDailyQuests = generateDailyQuests();
    activeQuests.push(...newDailyQuests);
  }

  // If no weekly quests exist, generate new ones
  const hasWeeklyQuests = activeQuests.some(quest => quest.type === 'weekly');
  if (!hasWeeklyQuests) {
    const newWeeklyQuests = generateWeeklyQuests();
    activeQuests.push(...newWeeklyQuests);
  }

  localStorage.setItem('activeQuests', JSON.stringify(activeQuests));
  return activeQuests;
}

export function saveQuests(quests: Quest[]): void {
  localStorage.setItem('activeQuests', JSON.stringify(quests));
}

export function getActiveChallenges(): Challenge[] {
  const stored = localStorage.getItem('activeChallenges');
  if (!stored) {
    const newChallenges = generateChallenges();
    localStorage.setItem('activeChallenges', JSON.stringify(newChallenges));
    return newChallenges;
  }
  return JSON.parse(stored);
}

export function saveChallenges(challenges: Challenge[]): void {
  localStorage.setItem('activeChallenges', JSON.stringify(challenges));
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
