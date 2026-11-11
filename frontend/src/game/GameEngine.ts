import * as BABYLON from '@babylonjs/core';
import type { GameConfig, GameState, PortalData, WorldKey } from './types';
import { buildAvatar } from './avatar';
import { buildHubWorld, buildMathJungleWorld } from './world';
import { PlayerController } from './playerController';

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

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.controller?.update();
      this.checkPortalProximity();
      this.checkStationProximity();
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
