import * as BABYLON from '@babylonjs/core';
import { ChildProfile } from '../types';

// Portal data structure
export interface PortalData {
  name: string;
  worldKey: string;
  position: BABYLON.Vector3;
  color: BABYLON.Color3;
  radius: number;
}

export interface GameConfig {
  canvasId: string;
  childProfile: ChildProfile;
  onPortalProximity?: (portal: PortalData | null) => void;
  onPortalEnter?: (portal: PortalData) => void;
  onNPCClick?: (npcId: string) => void;
}

// Game State enum for clean state management
export type GameState = 'HUB' | 'QUEST_ACTIVE' | 'QUEST_COMPLETE';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private camera: BABYLON.FollowCamera | null = null;
  private playerRoot: BABYLON.TransformNode | null = null;
  private avatarMeshes: BABYLON.Mesh[] = [];
  private config: GameConfig;
  private keys: { [key: string]: boolean } = {};
  private playerSpeed = 0.15;
  private isJumping = false;
  private jumpVelocity = 0;
  private gravity = -0.015;
  private groundLevel = 0;
  private gameState: GameState = 'HUB';
  
  // Animation state
  private isMoving = false;
  private idleTime = 0;
  private walkCycle = 0;
  
  // Portal proximity system
  private portals: PortalData[] = [];
  private currentPortalProximity: PortalData | null = null;
  private portalDwellTime = 0;
  private readonly PORTAL_TRIGGER_RADIUS = 4;
  // Dwell threshold for auto-enter (currently disabled, use E key)
  // private readonly DWELL_THRESHOLD = 1000;

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
    this.setupInput();
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
    this.createGround();
    this.createPlayer();
    this.createCamera();
    this.createQuestPortals();
    this.createNPCs();
    this.addDecorations();
    this.createSkybox();
  }

  private createGround(): void {
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60, subdivisions: 4 }, this.scene);
    const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.7, 0.3);
    groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;
    ground.receiveShadows = true;
    ground.checkCollisions = true;
    
    for (let i = 0; i < 20; i++) {
      const patch = BABYLON.MeshBuilder.CreateDisc(`grassPatch_${i}`, { radius: Math.random() * 3 + 1 }, this.scene);
      patch.rotation.x = Math.PI / 2;
      patch.position.x = (Math.random() - 0.5) * 50;
      patch.position.z = (Math.random() - 0.5) * 50;
      patch.position.y = 0.01;
      const patchMat = new BABYLON.StandardMaterial(`patchMat_${i}`, this.scene);
      patchMat.diffuseColor = new BABYLON.Color3(0.25, 0.6, 0.25);
      patch.material = patchMat;
    }
  }

  private createPlayer(): void {
    this.playerRoot = new BABYLON.TransformNode('playerRoot', this.scene);
    this.playerRoot.position = new BABYLON.Vector3(0, 0, 0);
    
    const collider = BABYLON.MeshBuilder.CreateCapsule('playerCollider', { height: 1.9, radius: 0.35 }, this.scene);
    collider.isVisible = false;
    collider.checkCollisions = true;
    collider.parent = this.playerRoot;
    collider.position.y = 0.95;
    
    this.createBlockyAvatar();
  }

  private createBlockyAvatar(): void {
    if (!this.playerRoot) return;
    
    const { avatar } = this.config.childProfile;
    const skinColor = this.getSkinColor(avatar.skin_tone);
    const outfitColor = this.getOutfitColor(avatar.outfit);
    const hairColor = this.getHairColor(avatar.hair_color);
    
    const avatarContainer = new BABYLON.TransformNode('avatarContainer', this.scene);
    avatarContainer.parent = this.playerRoot;
    
    // HEAD
    const head = BABYLON.MeshBuilder.CreateBox('head', { width: 0.5, height: 0.5, depth: 0.5 }, this.scene);
    head.position.y = 1.65;
    head.parent = avatarContainer;
    const headMat = new BABYLON.StandardMaterial('headMat', this.scene);
    headMat.diffuseColor = skinColor;
    head.material = headMat;
    this.avatarMeshes.push(head);
    
    this.createFace(head);
    this.createHair(avatarContainer, avatar.hair_style, hairColor);
    
    // TORSO
    const torso = BABYLON.MeshBuilder.CreateBox('torso', { width: 0.6, height: 0.7, depth: 0.35 }, this.scene);
    torso.position.y = 1.05;
    torso.parent = avatarContainer;
    const torsoMat = new BABYLON.StandardMaterial('torsoMat', this.scene);
    torsoMat.diffuseColor = outfitColor;
    torso.material = torsoMat;
    this.avatarMeshes.push(torso);
    
    // ARMS
    const armMat = new BABYLON.StandardMaterial('armMat', this.scene);
    armMat.diffuseColor = skinColor;
    
    const leftArm = BABYLON.MeshBuilder.CreateBox('leftArm', { width: 0.2, height: 0.6, depth: 0.2 }, this.scene);
    leftArm.position.set(-0.4, 1.05, 0);
    leftArm.parent = avatarContainer;
    leftArm.material = armMat;
    this.avatarMeshes.push(leftArm);
    
    const rightArm = BABYLON.MeshBuilder.CreateBox('rightArm', { width: 0.2, height: 0.6, depth: 0.2 }, this.scene);
    rightArm.position.set(0.4, 1.05, 0);
    rightArm.parent = avatarContainer;
    rightArm.material = armMat;
    this.avatarMeshes.push(rightArm);
    
    // LEGS
    const legMat = new BABYLON.StandardMaterial('legMat', this.scene);
    legMat.diffuseColor = new BABYLON.Color3(0.2, 0.3, 0.5);
    
    const leftLeg = BABYLON.MeshBuilder.CreateBox('leftLeg', { width: 0.25, height: 0.7, depth: 0.25 }, this.scene);
    leftLeg.position.set(-0.15, 0.35, 0);
    leftLeg.parent = avatarContainer;
    leftLeg.material = legMat;
    this.avatarMeshes.push(leftLeg);
    
    const rightLeg = BABYLON.MeshBuilder.CreateBox('rightLeg', { width: 0.25, height: 0.7, depth: 0.25 }, this.scene);
    rightLeg.position.set(0.15, 0.35, 0);
    rightLeg.parent = avatarContainer;
    rightLeg.material = legMat;
    this.avatarMeshes.push(rightLeg);
  }

  private createFace(head: BABYLON.Mesh): void {
    const eyeMat = new BABYLON.StandardMaterial('eyeMat', this.scene);
    eyeMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    const leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.08 }, this.scene);
    leftEye.position.set(-0.12, 0.08, 0.25);
    leftEye.parent = head;
    leftEye.material = eyeMat;
    
    const rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.08 }, this.scene);
    rightEye.position.set(0.12, 0.08, 0.25);
    rightEye.parent = head;
    rightEye.material = eyeMat;
    
    const smile = BABYLON.MeshBuilder.CreateBox('smile', { width: 0.12, height: 0.02, depth: 0.02 }, this.scene);
    smile.position.set(0, -0.08, 0.24);
    smile.parent = head;
    const smileMat = new BABYLON.StandardMaterial('smileMat', this.scene);
    smileMat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.2);
    smile.material = smileMat;
  }

  private createHair(parent: BABYLON.TransformNode, style: string, color: BABYLON.Color3): void {
    const hairMat = new BABYLON.StandardMaterial('hairMat', this.scene);
    hairMat.diffuseColor = color;
    
    if (style === 'spiky' || style === 'short') {
      for (let i = 0; i < 5; i++) {
        const spike = BABYLON.MeshBuilder.CreateCylinder(`spike_${i}`, { height: 0.2, diameterTop: 0, diameterBottom: 0.1 }, this.scene);
        spike.position.y = 1.95;
        spike.position.x = (i - 2) * 0.12;
        spike.parent = parent;
        spike.material = hairMat;
        this.avatarMeshes.push(spike);
      }
    } else {
      const hair = BABYLON.MeshBuilder.CreateBox('hair', { width: 0.52, height: 0.15, depth: 0.52 }, this.scene);
      hair.position.y = 1.95;
      hair.parent = parent;
      hair.material = hairMat;
      this.avatarMeshes.push(hair);
    }
  }

  private getSkinColor(tone: string): BABYLON.Color3 {
    const tones: { [key: string]: BABYLON.Color3 } = {
      light: new BABYLON.Color3(1, 0.87, 0.77),
      medium: new BABYLON.Color3(0.87, 0.72, 0.53),
      tan: new BABYLON.Color3(0.76, 0.57, 0.42),
      dark: new BABYLON.Color3(0.55, 0.38, 0.26),
    };
    return tones[tone] || tones.medium;
  }

  private getOutfitColor(outfit: string): BABYLON.Color3 {
    const outfits: { [key: string]: BABYLON.Color3 } = {
      casual_blue: new BABYLON.Color3(0, 0.6, 1),
      casual_red: new BABYLON.Color3(0.9, 0.2, 0.2),
      superhero_cape: new BABYLON.Color3(0.8, 0.1, 0.1),
      default: new BABYLON.Color3(0, 0.6, 1),
    };
    return outfits[outfit] || outfits.default;
  }

  private getHairColor(color: string): BABYLON.Color3 {
    const colors: { [key: string]: BABYLON.Color3 } = {
      black: new BABYLON.Color3(0.1, 0.1, 0.1),
      brown: new BABYLON.Color3(0.4, 0.26, 0.13),
      blonde: new BABYLON.Color3(0.9, 0.8, 0.5),
      red: new BABYLON.Color3(0.7, 0.2, 0.1),
    };
    return colors[color] || colors.brown;
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

  private createQuestPortals(): void {
    const portalDefs = [
      { name: 'Math Jungle', worldKey: 'math_jungle', position: new BABYLON.Vector3(-15, 0, 0), color: new BABYLON.Color3(0.2, 0.9, 0.3) },
      { name: 'Code City', worldKey: 'code_city', position: new BABYLON.Vector3(0, 0, -15), color: new BABYLON.Color3(0.2, 0.6, 1) },
      { name: 'Science Spaceport', worldKey: 'science_spaceport', position: new BABYLON.Vector3(15, 0, 0), color: new BABYLON.Color3(0.7, 0.3, 1) },
    ];
    
    portalDefs.forEach((def) => {
      const portalData: PortalData = {
        name: def.name,
        worldKey: def.worldKey,
        position: def.position,
        color: def.color,
        radius: this.PORTAL_TRIGGER_RADIUS,
      };
      this.portals.push(portalData);
      
      // Portal base platform
      const platform = BABYLON.MeshBuilder.CreateCylinder(`platform_${def.name}`, { height: 0.2, diameter: 4 }, this.scene);
      platform.position = def.position.clone();
      platform.position.y = 0.1;
      const platformMat = new BABYLON.StandardMaterial(`platformMat_${def.name}`, this.scene);
      platformMat.diffuseColor = def.color.scale(0.5);
      platform.material = platformMat;
      platform.receiveShadows = true;
      
      // Portal ring
      const portalRing = BABYLON.MeshBuilder.CreateTorus(`portal_${def.name}`, { diameter: 3, thickness: 0.3, tessellation: 32 }, this.scene);
      portalRing.position = def.position.clone();
      portalRing.position.y = 2;
      portalRing.rotation.x = Math.PI / 2;
      const portalMat = new BABYLON.StandardMaterial(`portalMat_${def.name}`, this.scene);
      portalMat.diffuseColor = def.color;
      portalMat.emissiveColor = def.color.scale(0.5);
      portalMat.alpha = 0.9;
      portalRing.material = portalMat;
      
      // Portal inner glow
      const portalInner = BABYLON.MeshBuilder.CreateDisc(`portalInner_${def.name}`, { radius: 1.3 }, this.scene);
      portalInner.position = def.position.clone();
      portalInner.position.y = 2;
      portalInner.rotation.x = Math.PI / 2;
      const innerMat = new BABYLON.StandardMaterial(`innerMat_${def.name}`, this.scene);
      innerMat.diffuseColor = def.color;
      innerMat.emissiveColor = def.color;
      innerMat.alpha = 0.6;
      portalInner.material = innerMat;
      
      // Glow effect
      const glow = new BABYLON.GlowLayer(`glow_${def.name}`, this.scene, { mainTextureFixedSize: 256, blurKernelSize: 64 });
      glow.addIncludedOnlyMesh(portalRing);
      glow.addIncludedOnlyMesh(portalInner);
      glow.intensity = 0.5;
      
      // Portal rotation animation
      this.scene.registerBeforeRender(() => {
        portalRing.rotation.z += 0.01;
        portalInner.rotation.y += 0.02;
      });
      
      // Click interaction (backup to proximity)
      platform.actionManager = new BABYLON.ActionManager(this.scene);
      platform.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
          if (this.config.onPortalEnter) {
            this.config.onPortalEnter(portalData);
          }
        })
      );
      
      // Create label
      this.create3DLabel(def.name, def.position.add(new BABYLON.Vector3(0, 4, 0)));
    });
  }

  private create3DLabel(text: string, position: BABYLON.Vector3): void {
    const plane = BABYLON.MeshBuilder.CreatePlane(`label_${text}`, { width: 3, height: 0.6 }, this.scene);
    plane.position = position;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    
    const texture = new BABYLON.DynamicTexture(`labelTex_${text}`, { width: 512, height: 128 }, this.scene, true);
    texture.drawText(text, null, 85, 'bold 48px Arial', 'white', 'transparent', true);
    
    const mat = new BABYLON.StandardMaterial(`labelMat_${text}`, this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    mat.opacityTexture = texture;
    mat.backFaceCulling = false;
    plane.material = mat;
  }

  private createNPCs(): void {
    const npcs = [
      { name: 'Guide', position: new BABYLON.Vector3(3, 0, 5), color: new BABYLON.Color3(1, 0.8, 0) },
      { name: 'Shop Keeper', position: new BABYLON.Vector3(-3, 0, 5), color: new BABYLON.Color3(0.9, 0.5, 0.2) },
    ];
    
    npcs.forEach((npcData) => {
      const npcContainer = new BABYLON.TransformNode(`npc_${npcData.name}`, this.scene);
      npcContainer.position = npcData.position;
      
      const body = BABYLON.MeshBuilder.CreateCapsule(`npcBody_${npcData.name}`, { height: 1.5, radius: 0.4 }, this.scene);
      body.position.y = 0.75;
      body.parent = npcContainer;
      const bodyMat = new BABYLON.StandardMaterial(`npcMat_${npcData.name}`, this.scene);
      bodyMat.diffuseColor = npcData.color;
      body.material = bodyMat;
      
      const head = BABYLON.MeshBuilder.CreateSphere(`npcHead_${npcData.name}`, { diameter: 0.5 }, this.scene);
      head.position.y = 1.7;
      head.parent = npcContainer;
      const headMat = new BABYLON.StandardMaterial(`npcHeadMat_${npcData.name}`, this.scene);
      headMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.6);
      head.material = headMat;
      
      let bobPhase = Math.random() * Math.PI * 2;
      this.scene.registerBeforeRender(() => {
        bobPhase += 0.03;
        npcContainer.position.y = npcData.position.y + Math.sin(bobPhase) * 0.1;
      });
      
      body.actionManager = new BABYLON.ActionManager(this.scene);
      body.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
          if (this.config.onNPCClick) {
            this.config.onNPCClick(npcData.name);
          }
        })
      );
      
      this.create3DLabel(npcData.name, npcData.position.add(new BABYLON.Vector3(0, 2.5, 0)));
    });
  }

  private addDecorations(): void {
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const radius = 22;
      this.createTree(new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    
    for (let i = 0; i < 10; i++) {
      const rock = BABYLON.MeshBuilder.CreateSphere(`rock_${i}`, { diameter: 0.5 + Math.random() * 0.5, segments: 6 }, this.scene);
      rock.position.x = (Math.random() - 0.5) * 40;
      rock.position.z = (Math.random() - 0.5) * 40;
      rock.position.y = 0.2;
      rock.scaling.y = 0.6;
      const rockMat = new BABYLON.StandardMaterial(`rockMat_${i}`, this.scene);
      rockMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      rock.material = rockMat;
    }
  }

  private createTree(position: BABYLON.Vector3): void {
    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: 2, diameterTop: 0.3, diameterBottom: 0.5 }, this.scene);
    trunk.position = position.clone();
    trunk.position.y = 1;
    const trunkMat = new BABYLON.StandardMaterial('trunkMat', this.scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.26, 0.13);
    trunk.material = trunkMat;
    
    const foliageMat = new BABYLON.StandardMaterial('foliageMat', this.scene);
    foliageMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
    
    const foliage1 = BABYLON.MeshBuilder.CreateCylinder('foliage1', { height: 1.5, diameterTop: 0, diameterBottom: 2 }, this.scene);
    foliage1.position = position.clone();
    foliage1.position.y = 2.5;
    foliage1.material = foliageMat;
    
    const foliage2 = BABYLON.MeshBuilder.CreateCylinder('foliage2', { height: 1.2, diameterTop: 0, diameterBottom: 1.5 }, this.scene);
    foliage2.position = position.clone();
    foliage2.position.y = 3.5;
    foliage2.material = foliageMat;
  }

  private createSkybox(): void {
    const skyDome = BABYLON.MeshBuilder.CreateSphere('skyDome', { diameter: 200, segments: 32 }, this.scene);
    const skyMat = new BABYLON.StandardMaterial('skyMat', this.scene);
    skyMat.backFaceCulling = false;
    skyMat.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
    skyMat.disableLighting = true;
    skyDome.material = skyMat;
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      
      // Jump on space
      if (e.key === ' ' && !this.isJumping && this.playerRoot) {
        this.isJumping = true;
        this.jumpVelocity = 0.25;
      }
      
      // E key to enter portal
      if ((e.key === 'e' || e.key === 'E') && this.currentPortalProximity) {
        this.enterPortal(this.currentPortalProximity);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
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
    
    // Check if portal proximity changed
    if (nearestPortal !== this.currentPortalProximity) {
      this.currentPortalProximity = nearestPortal;
      this.portalDwellTime = 0;
      
      // Notify UI
      if (this.config.onPortalProximity) {
        this.config.onPortalProximity(nearestPortal);
      }
    }
    
    // Track dwell time for auto-enter (optional feature)
    if (this.currentPortalProximity) {
      this.portalDwellTime += 16; // Approximate frame time
      
      // Auto-enter after dwell threshold (commented out - use E key instead)
      // if (this.portalDwellTime >= this.DWELL_THRESHOLD) {
      //   this.enterPortal(this.currentPortalProximity);
      // }
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

  private updatePlayer(): void {
    if (!this.playerRoot || !this.camera) return;
    
    let moveX = 0;
    let moveZ = 0;
    
    if (this.keys['w'] || this.keys['arrowup']) moveZ = 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ = -1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX = -1;
    if (this.keys['d'] || this.keys['arrowright']) moveX = 1;
    
    this.isMoving = moveX !== 0 || moveZ !== 0;
    
    if (this.isMoving) {
      const cameraDirection = this.camera.getDirection(BABYLON.Axis.Z);
      cameraDirection.y = 0;
      cameraDirection.normalize();
      const cameraRight = BABYLON.Vector3.Cross(cameraDirection, BABYLON.Axis.Y);
      
      const movement = cameraDirection.scale(moveZ).add(cameraRight.scale(-moveX));
      movement.normalize().scaleInPlace(this.playerSpeed);
      
      this.playerRoot.position.addInPlace(movement);
      
      if (movement.length() > 0.001) {
        const targetAngle = Math.atan2(movement.x, movement.z);
        this.playerRoot.rotation.y = targetAngle;
      }
      
      this.walkCycle += 0.15;
      this.animateWalk();
    } else {
      this.idleTime += 0.02;
      this.animateIdle();
    }
    
    // Handle jumping
    if (this.isJumping) {
      this.playerRoot.position.y += this.jumpVelocity;
      this.jumpVelocity += this.gravity;
      
      if (this.playerRoot.position.y <= this.groundLevel) {
        this.playerRoot.position.y = this.groundLevel;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }
    
    // Clamp to ground bounds
    const bounds = 28;
    this.playerRoot.position.x = Math.max(-bounds, Math.min(bounds, this.playerRoot.position.x));
    this.playerRoot.position.z = Math.max(-bounds, Math.min(bounds, this.playerRoot.position.z));
    
    // Check portal proximity
    this.checkPortalProximity();
  }

  private animateWalk(): void {
    const leftArm = this.scene.getMeshByName('leftArm');
    const rightArm = this.scene.getMeshByName('rightArm');
    const leftLeg = this.scene.getMeshByName('leftLeg');
    const rightLeg = this.scene.getMeshByName('rightLeg');
    
    const swing = Math.sin(this.walkCycle) * 0.4;
    
    if (leftArm) leftArm.rotation.x = -swing;
    if (rightArm) rightArm.rotation.x = swing;
    if (leftLeg) leftLeg.rotation.x = swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
  }

  private animateIdle(): void {
    const leftArm = this.scene.getMeshByName('leftArm');
    const rightArm = this.scene.getMeshByName('rightArm');
    const leftLeg = this.scene.getMeshByName('leftLeg');
    const rightLeg = this.scene.getMeshByName('rightLeg');
    
    const breathe = Math.sin(this.idleTime) * 0.05;
    
    if (leftArm) leftArm.rotation.x = breathe;
    if (rightArm) rightArm.rotation.x = breathe;
    if (leftLeg) leftLeg.rotation.x = 0;
    if (rightLeg) rightLeg.rotation.x = 0;
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.updatePlayer();
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
    this.scene.dispose();
    this.engine.dispose();
  }
}
