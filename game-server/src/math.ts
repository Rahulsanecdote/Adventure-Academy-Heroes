// Boss-fight math question generation.
//
// MIRRORED from the FastAPI backend (backend/app/utils/math_challenge.py):
// same operand ranges, same operations, same tweaks (subtraction results
// stay non-negative; the multiplication second factor stays small). The
// backend file remains the reference implementation — if its ranges change,
// change them here too. Kept deliberately tiny and pure.

export type Difficulty = 'easy' | 'medium' | 'hard';

const RANGES: Record<Difficulty, Record<string, [number, number]>> = {
  easy: { addition: [2, 20], subtraction: [3, 20], multiplication: [2, 5] },
  medium: { addition: [15, 99], subtraction: [20, 99], multiplication: [3, 9] },
  hard: { addition: [75, 499], subtraction: [100, 499], multiplication: [6, 12] },
};

const OPERATIONS = ['addition', 'subtraction', 'multiplication'];
const SYMBOLS: Record<string, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: '×',
};

function randint(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export interface BossQuestion {
  prompt: string;
  operation: string;
  answer: number;
}

export function generateQuestion(difficulty: string): BossQuestion {
  const diff = (RANGES[difficulty as Difficulty] ? difficulty : 'easy') as Difficulty;
  const ranges = RANGES[diff];
  const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
  const [lo, hi] = ranges[operation];
  let a = randint(lo, hi);
  let b = randint(lo, hi);
  let answer: number;

  if (operation === 'addition') {
    answer = a + b;
  } else if (operation === 'subtraction') {
    if (b > a) [a, b] = [b, a];
    answer = a - b;
  } else {
    b = randint(2, Math.max(3, Math.min(hi, diff !== 'hard' ? 9 : 12)));
    answer = a * b;
  }

  return { prompt: `${a} ${SYMBOLS[operation]} ${b} = ?`, operation, answer };
}

/** Room age band -> boss difficulty (mirrors the backend's band mapping). */
export function difficultyForAgeBand(ageBand: string): Difficulty {
  return ageBand === '10-12' ? 'medium' : 'easy';
}
