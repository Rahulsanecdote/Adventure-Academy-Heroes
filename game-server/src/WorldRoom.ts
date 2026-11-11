// KidQuest WorldRoom (Phase 2): one room = one world instance for one age
// band (plus a party code for private rooms). Holds presence state, relays
// validated movement, phrase chat (allowlisted IDs only), and — in Math
// Jungle rooms — the co-op boss fight.
//
// The game server is NEVER the progression authority: boss-defeat rewards
// are requested from FastAPI (POST /api/multiplayer/boss-reward) with a
// shared internal secret, and awarded there.
import { Room, Client, ServerError } from 'colyseus';
import { Schema, MapSchema, type } from '@colyseus/schema';
import * as jwt from 'jsonwebtoken';
import { loadPhrases } from './phrases';
import { generateQuestion, difficultyForAgeBand, BossQuestion } from './math';

export class Player extends Schema {
  @type('string') childId = '';
  @type('string') displayName = '';
  @type('string') avatarJson = '';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('number') z = 0;
  @type('number') rotY = 0;
  @type('string') world = 'hub';
  @type('string') anim = 'idle';
  @type('string') phraseId = '';
  @type('number') phraseAt = 0;
}

export class BossState extends Schema {
  @type('boolean') active = false;
  @type('number') hp = 0;
  @type('number') maxHp = 10;
}

export class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(BossState) boss = new BossState();
}

interface GameTokenClaims {
  child_id: string;
  display_name: string;
  age_band: string;
  avatar: Record<string, unknown>;
}

interface RoomOptions {
  world?: string;
  ageBand?: string;
  partyCode?: string;
}

const WORLDS = ['hub', 'math_jungle'];
const AGE_BANDS = ['7-9', '10-12'];
const MAX_SPEED = 12; // world units / second (client walks ~9 u/s)
const POSITION_BOUND = 120;
const PHRASE_RATE_LIMIT_MS = 2000;
const BOSS_MAX_HP = 10;

const JWT_SECRET = process.env.GAME_JWT_SECRET || 'dev-secret-key-change-in-production';
const FASTAPI_URL = process.env.FASTAPI_URL || '';
const INTERNAL_SECRET = process.env.MULTIPLAYER_INTERNAL_SECRET || '';

const PHRASES = loadPhrases();
const PHRASE_IDS = new Set(PHRASES.map((p) => p.id));

function sanitizeName(name: unknown): string {
  const raw = typeof name === 'string' ? name : 'Player';
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
  return clean || 'Player';
}

function sanitizeAvatar(avatar: unknown): string {
  const allowed = ['skin_tone', 'hair_style', 'hair_color', 'outfit', 'outfit_color', 'accessory'];
  const out: Record<string, string | null> = {};
  if (avatar && typeof avatar === 'object') {
    for (const key of allowed) {
      const value = (avatar as Record<string, unknown>)[key];
      if (typeof value === 'string') out[key] = value.slice(0, 32);
      else if (value === null) out[key] = null;
    }
  }
  return JSON.stringify(out);
}

export class WorldRoom extends Room<WorldState> {
  maxClients = 16;

  private roomWorld = 'hub';
  private roomAgeBand: string | null = null;
  private lastMoveAt = new Map<string, number>();
  private lastPhraseAt = new Map<string, number>();
  private bossQuestions = new Map<string, BossQuestion>();
  private bossParticipants = new Set<string>();

  onCreate(options: RoomOptions) {
    const world = options?.world && WORLDS.includes(options.world) ? options.world : 'hub';
    this.roomWorld = world;
    this.setState(new WorldState());
    this.state.boss.maxHp = BOSS_MAX_HP;

    this.onMessage('move', (client, data) => this.handleMove(client, data));
    this.onMessage('phrase', (client, data) => this.handlePhrase(client, data));
    this.onMessage('boss_start', (client) => this.handleBossStart(client));
    this.onMessage('boss_answer', (client, data) => this.handleBossAnswer(client, data));

    console.log(`[room] created world=${world} roomId=${this.roomId}`);
  }

  async onAuth(_client: Client, options: RoomOptions & { token?: string }) {
    const token = options?.token;
    if (!token) {
      throw new ServerError(401, 'Missing game session token');
    }
    let claims: GameTokenClaims;
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      if (decoded.type !== 'game' || !decoded.child_id) {
        throw new Error('not a game token');
      }
      claims = decoded as unknown as GameTokenClaims;
    } catch {
      throw new ServerError(401, 'Invalid or expired game session token');
    }

    if (options?.world && !WORLDS.includes(options.world)) {
      throw new ServerError(400, `Unknown world: ${options.world}`);
    }
    return claims;
  }

  onJoin(client: Client, options: RoomOptions, auth: GameTokenClaims) {
    // Age-band segregation is enforced from the token claim, not from what
    // the client asked for: the first player's claim fixes the room band.
    if (this.roomAgeBand === null) {
      this.roomAgeBand = AGE_BANDS.includes(auth.age_band) ? auth.age_band : '7-9';
    } else if (auth.age_band !== this.roomAgeBand) {
      throw new ServerError(403, 'Age band does not match this room');
    }

    const player = new Player();
    player.childId = String(auth.child_id);
    player.displayName = sanitizeName(auth.display_name);
    player.avatarJson = sanitizeAvatar(auth.avatar);
    player.world = this.roomWorld;
    player.x = 0;
    player.y = 0;
    player.z = this.roomWorld === 'math_jungle' ? 12 : 0;
    this.state.players.set(client.sessionId, player);
    this.lastMoveAt.set(client.sessionId, Date.now());

    console.log(
      `[room ${this.roomId}] join ${player.displayName} (child ${player.childId}) ` +
      `world=${this.roomWorld} band=${this.roomAgeBand} players=${Object.keys(this.state.players).length}`
    );
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.lastMoveAt.delete(client.sessionId);
    this.lastPhraseAt.delete(client.sessionId);
    this.bossQuestions.delete(client.sessionId);
  }

  // ------------------------------------------------------------------ move
  private handleMove(client: Client, data: { x?: unknown; y?: unknown; z?: unknown; rotY?: unknown; anim?: unknown }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !data) return;

    const x = Number(data.x);
    const y = Number(data.y);
    const z = Number(data.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

    const now = Date.now();
    const dt = Math.max((now - (this.lastMoveAt.get(client.sessionId) || now)) / 1000, 0.001);
    this.lastMoveAt.set(client.sessionId, now);

    // Speed clamp: allow 1.5x max speed plus a small slack for jitter; move
    // the player only as far as allowed toward the requested position.
    const dx = x - player.x;
    const dy = y - player.y;
    const dz = z - player.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const allowed = MAX_SPEED * dt * 1.5 + 1.0;
    let nx = x, ny = y, nz = z;
    if (dist > allowed && dist > 0) {
      const scale = allowed / dist;
      nx = player.x + dx * scale;
      ny = player.y + dy * scale;
      nz = player.z + dz * scale;
    }

    player.x = Math.max(-POSITION_BOUND, Math.min(POSITION_BOUND, nx));
    player.z = Math.max(-POSITION_BOUND, Math.min(POSITION_BOUND, nz));
    player.y = Math.max(-2, Math.min(30, ny));

    const rotY = Number(data.rotY);
    if (Number.isFinite(rotY)) player.rotY = rotY;
    player.anim = data.anim === 'walk' || data.anim === 'jump' ? data.anim : 'idle';
  }

  // ---------------------------------------------------------------- phrase
  private handlePhrase(client: Client, data: { phraseId?: unknown }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const phraseId = typeof data?.phraseId === 'string' ? data.phraseId : '';
    if (!PHRASE_IDS.has(phraseId)) {
      client.send('phrase_rejected', { reason: 'unknown_phrase' });
      return;
    }
    const now = Date.now();
    if (now - (this.lastPhraseAt.get(client.sessionId) || 0) < PHRASE_RATE_LIMIT_MS) {
      client.send('phrase_rejected', { reason: 'rate_limited' });
      return;
    }
    this.lastPhraseAt.set(client.sessionId, now);
    player.phraseId = phraseId;
    player.phraseAt = now;
  }

  // ------------------------------------------------------------------ boss
  private handleBossStart(client: Client) {
    if (this.roomWorld !== 'math_jungle') {
      client.send('boss_event', { type: 'unavailable', reason: 'not_in_math_jungle' });
      return;
    }
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (!this.state.boss.active) {
      this.state.boss.active = true;
      this.state.boss.hp = BOSS_MAX_HP;
      this.bossParticipants.clear();
      this.broadcast('boss_event', { type: 'started', hp: BOSS_MAX_HP });
      console.log(`[room ${this.roomId}] boss fight started by ${player.displayName}`);
    }
    this.bossParticipants.add(player.childId);
    this.sendBossQuestion(client);
  }

  private sendBossQuestion(client: Client) {
    const question = generateQuestion(difficultyForAgeBand(this.roomAgeBand || '7-9'));
    this.bossQuestions.set(client.sessionId, question);
    client.send('boss_question', { prompt: question.prompt });
  }

  private handleBossAnswer(client: Client, data: { answer?: unknown }) {
    if (!this.state.boss.active) return;
    const player = this.state.players.get(client.sessionId);
    const question = this.bossQuestions.get(client.sessionId);
    if (!player || !question) {
      if (player) this.sendBossQuestion(client);
      return;
    }

    const answer = Number(data?.answer);
    const correct = Number.isFinite(answer) && answer === question.answer;
    this.bossQuestions.delete(client.sessionId);

    if (!correct) {
      client.send('boss_result', { correct: false, hp: this.state.boss.hp });
      this.sendBossQuestion(client);
      return;
    }

    this.bossParticipants.add(player.childId);
    this.state.boss.hp = Math.max(0, this.state.boss.hp - 1);
    client.send('boss_result', { correct: true, hp: this.state.boss.hp });

    if (this.state.boss.hp <= 0) {
      this.state.boss.active = false;
      const participants = [...this.bossParticipants];
      this.broadcast('boss_event', { type: 'defeated', participants });
      console.log(`[room ${this.roomId}] boss defeated by ${participants.length} participant(s)`);
      void this.requestBossRewards(participants);
      this.bossParticipants.clear();
      return;
    }

    this.sendBossQuestion(client);
  }

  /** Ask FastAPI to award the participants. Graceful no-op when the
   *  internal bridge is not configured (boss is bragging-rights only). */
  private async requestBossRewards(childIds: string[]) {
    if (!FASTAPI_URL || !INTERNAL_SECRET) {
      console.log('[boss] reward bridge not configured — victory is bragging-rights only');
      return;
    }
    try {
      const response = await fetch(`${FASTAPI_URL}/api/multiplayer/boss-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({ child_ids: childIds, source: 'boss' }),
      });
      console.log(`[boss] reward request -> FastAPI ${response.status}`);
    } catch (err) {
      console.error('[boss] reward request failed:', err);
    }
  }
}
