export const difficultyLevels = [
  "Very Easy",
  "Easy",
  "Medium",
  "Hard",
  "Very Hard",
] as const;

export type Difficulty = (typeof difficultyLevels)[number];
