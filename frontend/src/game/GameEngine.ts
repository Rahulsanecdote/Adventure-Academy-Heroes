import * as BABYLON from '@babylonjs/core';
import type { GameConfig, GameState, PortalData } from './types';
import { buildAvatar } from './avatar';
import { buildHubWorld } from './world';
import { PlayerController } from './playerController';

export * from './types';

// ---------------------------------------------------------------------------
// GameEngine — thin composition layer.
// Scene/lighting setup and the render loop live here; avatar building is in
// avatar.ts, world construction in world.ts, and movement/animation in
// playerController.ts. (Split from the original single-file engine in
// Phase 0 — behaviour unchanged.)
// ---------------------------------------------------------------------------

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

  // Portal proximity system
  private portals: PortalData[] = [];
  private currentPortalProximity: PortalData | null = null;
  private portalDwellTime = 0;

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

    return scene;
  }

  public setupWorld(): void {
    const built = buildHubWorld(this.scene, {
      onPortalEnter: (portal) => this.config.onPortalEnter?.(portal),
      onNPCClick: (npcId) => this.config.onNPCClick?.(npcId),
    });
    this.portals = built.portals;

    this.createPlayer();
    this.createCamera();
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
          this.enterPortal(this.currentPortalProximity);
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

  private enterPortal(portal: PortalData): void {
    if (this.config.onPortalEnter) {
      this.config.onPortalEnter(portal);
    }
    // Reset proximity to prevent re-triggering
    this.currentPortalProximity = null;
    this.portalDwellTime = 0;
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.controller?.update();
      this.checkPortalProximity();
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
