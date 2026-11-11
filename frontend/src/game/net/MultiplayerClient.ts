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
    this.engine = engine;
    try {
      const session = await multiplayerAPI.sessionToken(this.childId);
      const room = await this.client.joinOrCreate<ServerState>('world', {
        token: session.token,
        world,
        ageBand: roomAgeBand(this.profileAgeBand),
        partyCode: this.partyCode,
      });
      this.attachRoom(room, world);
      this.online = true;
      this.currentWorld = world;
      return true;
    } catch (err) {
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
    });
    this.bossCallbacks?.onBossState(state.boss.active, state.boss.hp, state.boss.maxHp);
    this.wireBoss(room);

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
      this.bossCallbacks?.onQuestion(msg.prompt);
    });
    room.onMessage('boss_result', (msg: { correct: boolean; hp: number }) => {
      this.bossCallbacks?.onResult(msg.correct, msg.hp);
    });
    room.onMessage('boss_event', (msg: { type: string; participants?: string[] }) => {
      this.bossCallbacks?.onEvent(msg);
    });
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
    try {
      await this.room?.leave();
    } catch {
      // already gone
    }
    this.room = null;
    this.online = false;
  }

  async disconnect(): Promise<void> {
    await this.leaveRoom();
  }
}
