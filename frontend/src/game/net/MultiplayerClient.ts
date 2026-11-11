// Multiplayer session client (Phase 2).
//
// Wraps one Colyseus room connection for the local child:
//  - fetches a short-lived game token from FastAPI (multiplayerAPI)
//  - joins the WorldRoom for the current world + age band (+ party code)
//  - streams local movement at ~10 Hz
//  - forwards remote-player state changes to the GameEngine for rendering
//  - phrase chat (allowlisted IDs only) and the co-op boss fight
//
// Multiplayer is ADDITIVE: if anything here fails (no token, server
// unreachable), connect() resolves to false and the game continues in
// single-player mode exactly as Phase 1.
import { Client, Room } from 'colyseus.js';
import type { GameEngine } from '../GameEngine';
import type { WorldKey } from '../types';
import type { AvatarCustomization } from '../../types';
import { multiplayerAPI } from '../../services/api';
import { phraseLabel } from './phrases';

const GAME_SERVER_URL =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_GAME_SERVER_URL ||
  'ws://localhost:2567';

const MOVE_SEND_INTERVAL_MS = 100;

export interface RemotePlayerState {
  childId: string;
  displayName: string;
  avatar: AvatarCustomization;
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: string;
  phraseId: string;
  phraseAt: number;
}

export interface BossCallbacks {
  onQuestion: (prompt: string) => void;
  onResult: (correct: boolean, hp: number) => void;
  onEvent: (event: { type: string; participants?: string[] }) => void;
  onBossState: (active: boolean, hp: number, maxHp: number) => void;
}

interface ServerPlayer {
  childId: string;
  displayName: string;
  avatarJson: string;
  x: number; y: number; z: number; rotY: number;
  anim: string;
  phraseId: string;
  phraseAt: number;
  onChange?: (cb: () => void) => void;
}

interface ServerState {
  players: Map<string, ServerPlayer> & {
    onAdd?: (cb: (player: ServerPlayer, sessionId: string) => void) => void;
    onRemove?: (cb: (player: ServerPlayer, sessionId: string) => void) => void;
  };
  boss: { active: boolean; hp: number; maxHp: number; onChange?: (cb: () => void) => void };
}

/** Room age band from a child's profile band (mirrors the backend map). */
export function roomAgeBand(profileBand: string): string {
  switch (profileBand) {
    case '9-10':
    case '11-12':
      return '10-12';
    default:
      return '7-9';
  }
}

function parseAvatar(json: string): AvatarCustomization {
  const fallback: AvatarCustomization = {
    skin_tone: 'light', hair_style: 'short', hair_color: 'brown', outfit: 'casual_blue',
  };
  try {
    return { ...fallback, ...(JSON.parse(json || '{}') as Partial<AvatarCustomization>) };
  } catch {
    return fallback;
  }
}

export class MultiplayerClient {
  private client: Client;
  private room: Room<ServerState> | null = null;
  private engine: GameEngine | null = null;
  private moveTimer: number | null = null;
  private bossCallbacks: BossCallbacks | null = null;
  private bossWiredRoom: Room<ServerState> | null = null;
  // Boss-join tracking: whether this client currently holds a question and
  // whether an auto-join has already been sent for the active fight.
  private bossHasQuestion = false;
  private bossJoinRequested = false;
  // Connection generation: bumped by connect() (new generation) and by
  // disconnect() (invalidates the in-flight one).
  // A connect() that finishes after its generation was invalidated must
  // abandon the room it just joined instead of attaching to a (possibly
  // disposed) engine — the StrictMode / unmount-mid-connect race.
  private connectionGeneration = 0;

  online = false;
  currentWorld: WorldKey = 'hub';

  constructor(
    private childId: string,
    private profileAgeBand: string,
    private partyCode: string = ''
  ) {
    this.client = new Client(GAME_SERVER_URL);
  }

  setBossCallbacks(callbacks: BossCallbacks): void {
    this.bossCallbacks = callbacks;
    if (this.room) this.wireBoss(this.room);
  }

  /** Connect and join the room for `world`. Returns false -> offline mode. */
  async connect(engine: GameEngine, world: WorldKey): Promise<boolean> {
    const generation = ++this.connectionGeneration;
    this.engine = engine;
    try {
      const session = await multiplayerAPI.sessionToken(this.childId);
      if (generation !== this.connectionGeneration) {
        // disconnect() (or a newer connect) happened while we awaited the
        // token: abandon before joining any room.
        return false;
      }
      const room = await this.client.joinOrCreate<ServerState>('world', {
        token: session.token,
        world,
        ageBand: roomAgeBand(this.profileAgeBand),
        partyCode: this.partyCode,
      });
      if (generation !== this.connectionGeneration) {
        // disconnect() happened while the join was in flight: leave the
        // room we just got, attach nothing, start no movement interval.
        try { await room.leave(); } catch { /* already gone */ }
        return false;
      }
      this.attachRoom(room, world);
      this.online = true;
      this.currentWorld = world;
      return true;
    } catch (err) {
      if (generation !== this.connectionGeneration) return false;
      console.warn('[Multiplayer] unavailable, continuing in offline mode:', err);
      this.online = false;
      return false;
    }
  }

  /** World switch (portal): leave the current room, join the new world's. */
  async switchWorld(world: WorldKey): Promise<boolean> {
    if (world === this.currentWorld && this.room) return true;
    await this.leaveRoom();
    if (!this.engine) return false;
    return this.connect(this.engine, world);
  }

  private attachRoom(room: Room<ServerState>, world: WorldKey): void {
    this.room = room;
    this.bossHasQuestion = false;
    this.bossJoinRequested = false;
    const engine = this.engine;
    if (!engine) return;

    const state = room.state;
    state.players.onAdd?.((player, sessionId) => {
      if (sessionId === room.sessionId) return;
      const sync = () => {
        engine.upsertRemotePlayer(sessionId, {
          childId: player.childId,
          displayName: player.displayName,
          avatar: parseAvatar(player.avatarJson),
          x: player.x, y: player.y, z: player.z,
          rotY: player.rotY, anim: player.anim,
          phraseId: player.phraseId, phraseAt: player.phraseAt,
        });
      };
      player.onChange?.(sync);
      sync();
    });
    state.players.onRemove?.((_player, sessionId) => {
      engine.removeRemotePlayer(sessionId);
    });
    // Players already in the room before our callbacks were wired.
    state.players.forEach((player, sessionId) => {
      if (sessionId !== room.sessionId) {
        engine.upsertRemotePlayer(sessionId, {
          childId: player.childId,
          displayName: player.displayName,
          avatar: parseAvatar(player.avatarJson),
          x: player.x, y: player.y, z: player.z,
          rotY: player.rotY, anim: player.anim,
          phraseId: player.phraseId, phraseAt: player.phraseAt,
        });
      }
    });

    state.boss.onChange?.(() => {
      this.bossCallbacks?.onBossState(state.boss.active, state.boss.hp, state.boss.maxHp);
      this.maybeAutoJoinBoss(state.boss.active);
    });
    this.bossCallbacks?.onBossState(state.boss.active, state.boss.hp, state.boss.maxHp);
    this.wireBoss(room);
    // Joining a room where a fight is already running (portal into Math
    // Jungle mid-fight, or a late room join): ask for a question right away.
    this.maybeAutoJoinBoss(state.boss.active);

    room.onLeave(() => {
      this.online = false;
      this.engine?.clearRemotePlayers();
    });

    // Stream local movement at ~10 Hz.
    if (this.moveTimer !== null) window.clearInterval(this.moveTimer);
    this.moveTimer = window.setInterval(() => {
      if (!this.room || !this.engine) return;
      const s = this.engine.getLocalPlayerState();
      this.room.send('move', { x: s.x, y: s.y, z: s.z, rotY: s.rotY, anim: s.anim });
    }, MOVE_SEND_INTERVAL_MS);
    void world;
  }

  private wireBoss(room: Room<ServerState>): void {
    if (!this.bossCallbacks || this.bossWiredRoom === room) return;
    this.bossWiredRoom = room;
    room.onMessage('boss_question', (msg: { prompt: string }) => {
      this.bossHasQuestion = true;
      this.bossJoinRequested = false;
      this.bossCallbacks?.onQuestion(msg.prompt);
    });
    room.onMessage('boss_result', (msg: { correct: boolean; hp: number }) => {
      // The question was consumed; the server sends the next one itself
      // while the fight continues, so this is not an auto-join trigger.
      this.bossHasQuestion = false;
      this.bossCallbacks?.onResult(msg.correct, msg.hp);
    });
    room.onMessage('boss_event', (msg: { type: string; participants?: string[] }) => {
      if (msg.type === 'defeated') {
        this.bossHasQuestion = false;
        this.bossJoinRequested = false;
      }
      this.bossCallbacks?.onEvent(msg);
    });
  }

  /** Auto-join: boss is active and we hold no question -> ask the server
   *  for one via boss_join (idempotent server-side). Sent at most once per
   *  question-less stretch; joinBoss() stays available as the UI fallback. */
  private maybeAutoJoinBoss(active: boolean): void {
    if (!active) {
      this.bossJoinRequested = false;
      return;
    }
    if (this.bossHasQuestion || this.bossJoinRequested) return;
    this.bossJoinRequested = true;
    this.room?.send('boss_join');
  }

  /** Join the active boss fight (fallback button in the boss panel, and
   *  safe to call repeatedly — the server keeps the existing question). */
  joinBoss(): void {
    if (!this.room || this.bossHasQuestion) return;
    this.bossJoinRequested = true;
    this.room.send('boss_join');
  }

  sendPhrase(phraseId: string): void {
    if (!this.room || !this.online) return;
    this.room.send('phrase', { phraseId });
    this.engine?.showLocalPhrase(phraseLabel(phraseId));
  }

  startBoss(): void {
    this.room?.send('boss_start');
  }

  answerBoss(answer: number): void {
    this.room?.send('boss_answer', { answer });
  }

  private async leaveRoom(): Promise<void> {
    if (this.moveTimer !== null) {
      window.clearInterval(this.moveTimer);
      this.moveTimer = null;
    }
    this.engine?.clearRemotePlayers();
    const room = this.room;
    this.room = null;
    this.bossWiredRoom = null;
    this.bossHasQuestion = false;
    this.bossJoinRequested = false;
    try {
      await room?.leave();
    } catch {
      // already gone
    }
    this.online = false;
  }

  async disconnect(): Promise<void> {
    // Invalidate any in-flight connect() FIRST: when its awaits resolve it
    // will see the generation mismatch, leave the room it just joined, and
    // attach nothing (no movement interval against a disposed engine).
    this.connectionGeneration++;
    await this.leaveRoom();
  }
}
