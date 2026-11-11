// Phrase-chat allowlist loader.
//
// The canonical phrase list lives in the frontend tree at
// frontend/src/game/net/phrases.json — ONE definition shared by both sides:
// the client bundles it for labels, this server loads it to validate the
// phrase IDs clients send. There is no free-text chat in KidQuest.
//
// Resolution order: $PHRASES_PATH, repo-checkout relative path, Docker path.
import * as fs from 'fs';
import * as path from 'path';

export interface Phrase {
  id: string;
  label: string;
}

function candidatePaths(): string[] {
  const fromEnv = process.env.PHRASES_PATH;
  const candidates = [
    fromEnv,
    // dist/phrases.js -> game-server/ -> repo root -> frontend/...
    path.resolve(__dirname, '../../frontend/src/game/net/phrases.json'),
    // Docker layout (see Dockerfile: phrases.json copied next to the app)
    path.resolve(__dirname, '../phrases.json'),
    path.resolve(process.cwd(), 'phrases.json'),
  ];
  return candidates.filter((p): p is string => Boolean(p));
}

export function loadPhrases(): Phrase[] {
  for (const candidate of candidatePaths()) {
    try {
      const raw = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.phrases) && parsed.phrases.length > 0) {
        console.log(`[phrases] loaded ${parsed.phrases.length} phrases from ${candidate}`);
        return parsed.phrases as Phrase[];
      }
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    'Could not load phrases.json. Set PHRASES_PATH to the canonical phrase list.'
  );
}
