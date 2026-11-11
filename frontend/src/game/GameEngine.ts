import * as BABYLON from '@babylonjs/core';
import type { GameConfig, GameState, PortalData, WorldKey } from './types';
import type { RemotePlayerState } from './net/MultiplayerClient';
import { buildAvatar } from './avatar';
import { buildHubWorld, buildMathJungleWorld } from './world';
import { PlayerController } from './playerController';
import { phraseLabel } from './net/phrases';

export * from './types';

// ---------------------------------------------------------------------------
// GameEngine — thin composition layer + scene system (Phase 1).
// Scene/lighting setup and the render loop live here; avatar building is in
// avatar.ts, world construction in world.ts, and movement/animation in
// playerController.ts.
//
// Worlds are built under a disposable root node. Walking into the Math
// Jungle portal loads the jungle scene in-engine (dispose hub root, build
// jungle, keep player + camera); the jungle's return portal loads the hub
// again. Other portals (Code City / Science Lab) still hand control to the
// React layer via onPortalEnter, exactly as before.
// ---------------------------------------------------------------------------

const STATION_TRIGGER_RADIUS = 3.5;

// Phase 2: a remote player's rendered avatar + interpolation target.
// Remote avatars reuse buildAvatar(); limb animation is name-based
// (PlayerController uses scene.getMeshByName, which resolves to the LOCAL
// avatar built first), so remotes get a gentle walk-bob on their root
// instead of limb swings.
interface RemoteAvatar {
  root: BABYLON.TransformNode;
  target: BABYLON.Vector3;
  targetRotY: number;
  phrasePlane: BABYLON.Mesh;
  phraseTexture: BABYLON.DynamicTexture;
  phraseId: string;
  /** Server timestamp (phraseAt) of the last phrase event we displayed.
   *  Retained after the bubble expires — it is the identity of the event,
   *  so a stale retained phraseId in state can never replay it. */
  phraseAt: number;
  phraseExpiresAt: number;
  anim: string;
}

const PHRASE_BUBBLE_MS = 4000;

function drawLabelTexture(
  texture: BABYLON.DynamicTexture,
  text: string,
  fontSize: number
): void {
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const { width, height } = texture.getSize();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(2, 2, width - 4, height - 4, 18);
  ctx.fill();
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, width / 2, height / 2 + 2, width - 24);
  texture.update();
}

function makeLabelPlane(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  width: number,
  height: number,
  y: number,
  textureWidth: number,
  textureHeight: number
): { plane: BABYLON.Mesh; texture: BABYLON.DynamicTexture } {
  const texture = new BABYLON.DynamicTexture(
    `label-${Math.random().toString(36).slice(2)}`,
    { width: textureWidth, height: textureHeight },
    scene,
    true
  );
  texture.hasAlpha = true;
  const material = new BABYLON.StandardMaterial(`labelMat-${Math.random().toString(36).slice(2)}`, scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.disableLighting = true;
  material.backFaceCulling = false;

  const plane = BABYLON.MeshBuilder.CreatePlane(
    `labelPlane-${Math.random().toString(36).slice(2)}`,
    { width, height },
    scene
  );
  plane.material = material;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.parent = parent;
  plane.position.y = y;
  plane.isPickable = false;
  return { plane, texture };
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FollowCamera | null = null;
  private playerRoot: BABYLON.TransformNode | null = null;
  private avatarMeshes: BABYLON.Mesh[] = [];
  private config: GameConfig;
  private gameState: GameState = 'HUB';

  private controller: PlayerController | null = null;

  // Scene system
  private currentWorld: WorldKey = 'hub';
  private worldRoot: BABYLON.TransformNode | null = null;

  // Portal proximity system
  private portals: PortalData[] = [];
  private currentPortalProximity: PortalData | null = null;
  private portalDwellTime = 0;

  // Quest station proximity (Math Jungle)
  private stations: { index: number; position: BABYLON.Vector3 }[] = [];
  private currentStationProximity: number | null = null;

  // Phase 2 multiplayer: remote players + local phrase bubble
  private remotes = new Map<string, RemoteAvatar>();
  private localPhrasePlane: BABYLON.Mesh | null = null;
  private localPhraseTexture: BABYLON.DynamicTexture | null = null;
  private localPhraseExpiresAt = 0;

  constructor(config: GameConfig) {
    this.config = config;
    const canvasElement = document.getElementById(config.canvasId) as HTMLCanvasElement;

    if (!canvasElement) {
      throw new Error(`Canvas with id ${config.canvasId} not found`);
    }

    this.canvas = canvasElement;
    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = this.createScene();
    this.startRenderLoop();
  }

  private createScene(): BABYLON.Scene {
    const scene = new BABYLON.Scene(this.engine);
    scene.clearColor = new BABYLON.Color4(0.4, 0.7, 1.0, 1.0);

    const ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.7;
    ambientLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.4);

    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.5;
    dirLight.position = new BABYLON.Vector3(20, 40, 20);

    scene.collisionsEnabled = true;

    // Tap/click on the ground = walk there (click-to-move / tap-to-move).
    scene.onPointerDown = (_evt, pickInfo) => {
      if (!pickInfo.hit || !pickInfo.pickedMesh || !pickInfo.pickedPoint) return;
      const name = pickInfo.pickedMesh.name;
      if (name.includes('ground') || name.includes('Ground') || name.startsWith('grassPatch')) {
        this.controller?.setMoveTarget(pickInfo.pickedPoint.clone());
      }
    };

    return scene;
  }

  public setupWorld(): void {
    this.createPlayer();
    this.createCamera();
    this.loadWorld('hub');
  }

  /** Dispose the current world and build another one in its place. */
  public loadWorld(key: WorldKey): void {
    if (this.worldRoot) {
      this.worldRoot.dispose(false);
      this.worldRoot = null;
    }
    this.portals = [];
    this.stations = [];
    this.currentPortalProximity = null;
    this.currentStationProximity = null;
    this.config.onPortalProximity?.(null);
    this.config.onStationProximity?.(null);

    const callbacks = {
      onPortalEnter: (portal: PortalData) => this.activatePortal(portal),
      onNPCClick: (npcId: string) => this.config.onNPCClick?.(npcId),
      onQuestStation: (index: number) => this.config.onQuestStation?.(index),
    };

    if (key === 'math_jungle') {
      const built = buildMathJungleWorld(this.scene, callbacks);
      this.worldRoot = built.root;
      this.portals = built.portals;
      this.stations = built.stations;
    } else {
      this.scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
      this.scene.fogDensity = 0;
      const built = buildHubWorld(this.scene, callbacks);
      this.worldRoot = built.root;
      this.portals = built.portals;
    }

    this.currentWorld = key;
    this.gameState = 'HUB';
    // Remote players belong to the old world's room; the multiplayer client
    // rejoins for the new world and re-adds whoever is there.
    this.clearRemotePlayers();

    // Respawn the player at the world's entry point
    if (this.playerRoot) {
      this.playerRoot.position = key === 'math_jungle'
        ? new BABYLON.Vector3(0, 0, 12)
        : new BABYLON.Vector3(0, 0, 0);
      this.playerRoot.rotation = new BABYLON.Vector3(0, 0, 0);
      this.controller?.setMoveTarget(null);
    }

    this.config.onWorldChange?.(key);
  }

  public getCurrentWorld(): WorldKey {
    return this.currentWorld;
  }

  /** Portal activation routing: in-engine world portals switch scenes;
   *  world-select portals keep the existing React quest flow. */
  private activatePortal(portal: PortalData): void {
    if (portal.worldKey === 'math_jungle' && this.currentWorld !== 'math_jungle') {
      this.loadWorld('math_jungle');
    } else if (portal.worldKey === 'hub' && this.currentWorld !== 'hub') {
      this.loadWorld('hub');
    } else {
      this.config.onPortalEnter?.(portal);
    }
    // Reset proximity to prevent re-triggering
    this.currentPortalProximity = null;
    this.portalDwellTime = 0;
  }

  private createPlayer(): void {
    this.playerRoot = new BABYLON.TransformNode('playerRoot', this.scene);
    this.playerRoot.position = new BABYLON.Vector3(0, 0, 0);

    const collider = BABYLON.MeshBuilder.CreateCapsule('playerCollider', { height: 1.9, radius: 0.35 }, this.scene);
    collider.isVisible = false;
    collider.checkCollisions = true;
    collider.parent = this.playerRoot;
    collider.position.y = 0.95;

    this.avatarMeshes.push(...buildAvatar(this.scene, this.playerRoot, this.config.childProfile.avatar));

    this.controller = new PlayerController(this.scene, this.playerRoot, () => this.camera, {
      onInteractKey: () => {
        if (this.currentPortalProximity) {
          this.activatePortal(this.currentPortalProximity);
        } else if (this.currentStationProximity !== null) {
          this.config.onQuestStation?.(this.currentStationProximity);
        }
      },
    });
  }

  private createCamera(): void {
    if (!this.playerRoot) return;

    this.camera = new BABYLON.FollowCamera('followCam', new BABYLON.Vector3(0, 2, -6), this.scene);
    this.camera.lockedTarget = this.playerRoot as unknown as BABYLON.AbstractMesh;
    this.camera.radius = 6;
    this.camera.heightOffset = 2;
    this.camera.rotationOffset = 180;
    this.camera.cameraAcceleration = 0.05;
    this.camera.maxCameraSpeed = 10;
    this.camera.attachControl();
  }

  private checkPortalProximity(): void {
    if (!this.playerRoot) return;

    const playerPos = this.playerRoot.position;
    let nearestPortal: PortalData | null = null;
    let nearestDist = Infinity;

    for (const portal of this.portals) {
      const dist = BABYLON.Vector3.Distance(playerPos, portal.position);
      if (dist < portal.radius && dist < nearestDist) {
        nearestPortal = portal;
        nearestDist = dist;
      }
    }

    if (nearestPortal !== this.currentPortalProximity) {
      this.currentPortalProximity = nearestPortal;
      this.portalDwellTime = 0;

      if (this.config.onPortalProximity) {
        this.config.onPortalProximity(nearestPortal);
      }
    }

    if (this.currentPortalProximity) {
      this.portalDwellTime += 16; // Approximate frame time
    }
  }

  private checkStationProximity(): void {
    if (!this.playerRoot || this.stations.length === 0) return;

    const playerPos = this.playerRoot.position;
    let nearest: number | null = null;
    let nearestDist = Infinity;

    for (const station of this.stations) {
      const dist = BABYLON.Vector3.Distance(playerPos, station.position);
      if (dist < STATION_TRIGGER_RADIUS && dist < nearestDist) {
        nearest = station.index;
        nearestDist = dist;
      }
    }

    if (nearest !== this.currentStationProximity) {
      this.currentStationProximity = nearest;
      this.config.onStationProximity?.(nearest);
    }
  }

  // ------------------------------------------------------- Phase 2: remote
  /** Local player transform for the multiplayer client to stream. */
  public getLocalPlayerState(): { x: number; y: number; z: number; rotY: number; anim: string } {
    const pos = this.playerRoot?.position;
    return {
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      z: pos?.z ?? 0,
      rotY: this.playerRoot?.rotation.y ?? 0,
      anim: this.controller?.getIsMoving() ? 'walk' : 'idle',
    };
  }

  /** Create a remote player's avatar, or update its interpolation target. */
  public upsertRemotePlayer(id: string, state: RemotePlayerState): void {
    let remote = this.remotes.get(id);
    if (!remote) {
      const root = new BABYLON.TransformNode(`remote-${id}`, this.scene);
      root.position = new BABYLON.Vector3(state.x, state.y, state.z);
      root.rotation.y = state.rotY;
      buildAvatar(this.scene, root, state.avatar);

      const name = makeLabelPlane(this.scene, root, 1.7, 0.42, 2.35, 512, 128);
      drawLabelTexture(name.texture, state.displayName, 56);

      const phrase = makeLabelPlane(this.scene, root, 2.4, 0.6, 3.0, 512, 128);
      phrase.plane.isVisible = false;

      remote = {
        root,
        target: root.position.clone(),
        targetRotY: state.rotY,
        phrasePlane: phrase.plane,
        phraseTexture: phrase.texture,
        phraseId: '',
        phraseAt: 0,
        phraseExpiresAt: 0,
        anim: state.anim,
      };
      this.remotes.set(id, remote);
    }

    remote.target.set(state.x, state.y, state.z);
    remote.targetRotY = state.rotY;
    remote.anim = state.anim;

    // A phrase event is identified by its synced phraseAt timestamp, NOT
    // by phraseId: the server retains the last phraseId indefinitely, so
    // keying off the ID replays an expired phrase on the next movement
    // update (and never refreshes a legitimate repeat of the same phrase).
    // A new phraseAt — even for the same phraseId — is a new event, and
    // its expiry is computed from phraseAt itself.
    if (state.phraseId && state.phraseAt && state.phraseAt !== remote.phraseAt) {
      remote.phraseAt = state.phraseAt;
      const label = phraseLabel(state.phraseId);
      const expiresAt = state.phraseAt + PHRASE_BUBBLE_MS;
      if (label && expiresAt > Date.now()) {
        drawLabelTexture(remote.phraseTexture, label, 44);
        remote.phrasePlane.isVisible = true;
        remote.phraseId = state.phraseId;
        remote.phraseExpiresAt = expiresAt;
      } else {
        // Already expired by the time we first saw it (e.g. joining a
        // room where a phrase is still retained in state): never show it.
        remote.phrasePlane.isVisible = false;
        remote.phraseId = state.phraseId;
        remote.phraseExpiresAt = expiresAt;
      }
    }
  }

  public removeRemotePlayer(id: string): void {
    const remote = this.remotes.get(id);
    if (!remote) return;
    remote.phraseTexture.dispose();
    remote.root.dispose(false);
    this.remotes.delete(id);
  }

  public clearRemotePlayers(): void {
    for (const id of [...this.remotes.keys()]) {
      this.removeRemotePlayer(id);
    }
  }

  /** Show a phrase bubble above the local player (own phrase echo). */
  public showLocalPhrase(text: string): void {
    if (!this.playerRoot || !text) return;
    if (!this.localPhrasePlane) {
      const made = makeLabelPlane(this.scene, this.playerRoot, 2.4, 0.6, 3.0, 512, 128);
      this.localPhrasePlane = made.plane;
      this.localPhraseTexture = made.texture;
    }
    drawLabelTexture(this.localPhraseTexture!, text, 44);
    this.localPhrasePlane.isVisible = true;
    this.localPhraseExpiresAt = Date.now() + PHRASE_BUBBLE_MS;
  }

  /** Interpolate remote avatars toward their latest synced positions. */
  private updateRemotes(): void {
    const now = Date.now();
    for (const remote of this.remotes.values()) {
      remote.root.position = BABYLON.Vector3.Lerp(remote.root.position, remote.target, 0.25);
      // Gentle bob while "walking" (limb animation is name-bound to local).
      if (remote.anim === 'walk') {
        remote.root.position.y = remote.target.y + Math.abs(Math.sin(now / 130)) * 0.06;
      }
      let delta = remote.targetRotY - remote.root.rotation.y;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      remote.root.rotation.y += delta * 0.3;

      if (remote.phrasePlane.isVisible && now > remote.phraseExpiresAt) {
        remote.phrasePlane.isVisible = false;
        remote.phraseId = '';
        // remote.phraseAt is deliberately NOT cleared: it marks this
        // phrase event as seen, so the retained state value cannot
        // re-display it on the next movement update.
      }
    }
    if (this.localPhrasePlane?.isVisible && now > this.localPhraseExpiresAt) {
      this.localPhrasePlane.isVisible = false;
    }
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.controller?.update();
      this.checkPortalProximity();
      this.checkStationProximity();
      this.updateRemotes();
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  public setGameState(state: GameState): void {
    this.gameState = state;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public dispose(): void {
    this.controller?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
