// Phrase chat labels (Phase 2). phrases.json is the canonical allowlist —
// the game server loads the same file to validate phrase IDs. Kids can only
// ever send an ID from this list; there is no free-text chat in KidQuest.
import phrasesData from './phrases.json';

export interface Phrase {
  id: string;
  label: string;
}

export const PHRASES: Phrase[] = phrasesData.phrases;

const LABELS = new Map(PHRASES.map((p) => [p.id, p.label]));

export function phraseLabel(id: string): string {
  return LABELS.get(id) || '';
}
