
export const XP_PER_CORRECT_ANSWER = 10;
const BASE_XP = 100;
const GROWTH_FACTOR = 1.5;

/**
 * Calculates the total XP required to reach a specific level.
 * @param level The target level.
 * @returns The total XP needed to reach that level.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // This uses a geometric progression formula to calculate XP for a given level.
  return Math.floor(BASE_XP * (Math.pow(GROWTH_FACTOR, level - 1) - 1) / (GROWTH_FACTOR - 1));
}

/**
 * Calculates the current level based on the total accumulated XP.
 * @param xp The total experience points.
 * @returns The current level.
 */
export function calculateLevel(xp: number): number {
  if (xp < BASE_XP) return 1;
  // This reverses the geometric progression to find the level from XP.
  let level = Math.floor(1 + Math.log(1 + (xp * (GROWTH_FACTOR - 1)) / BASE_XP) / Math.log(GROWTH_FACTOR));
  return level;
}

/**
 * Calculates the percentage of XP progress towards the next level.
 * @param xp The total experience points.
 * @returns The progress percentage (0-100).
 */
export function getLevelProgress(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const xpForCurrentLevel = xpForLevel(currentLevel);
  const xpForNextLevel = xpForLevel(currentLevel + 1);

  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

  if (xpNeededForLevel === 0) return 100;

  const progress = Math.floor((xpIntoLevel / xpNeededForLevel) * 100);
  return Math.max(0, Math.min(100, progress));
}
