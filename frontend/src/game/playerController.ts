import * as BABYLON from '@babylonjs/core';

// ---------------------------------------------------------------------------
// Third-person player controller: WASD / arrow-key movement relative to the
// follow camera, space to jump, E to interact, plus tap-to-move targets set
// from pointer picks (touch support). Limb swing / idle breathing animation
// is driven from here by mesh name, as in the original GameEngine.
// ---------------------------------------------------------------------------

export interface PlayerControllerCallbacks {
  onInteractKey?: () => void;
}

export class PlayerController {
  private scene: BABYLON.Scene;
  private playerRoot: BABYLON.TransformNode;
  private getCamera: () => BABYLON.FollowCamera | null;
  private callbacks: PlayerControllerCallbacks;

  private keys: { [key: string]: boolean } = {};
  private playerSpeed = 0.15;
  private isJumping = false;
  private jumpVelocity = 0;
  private gravity = -0.015;
  private groundLevel = 0;
  private bounds = 28;

  private isMoving = false;
  private idleTime = 0;
  private walkCycle = 0;

  // Tap-to-move target (set by pointer picking in the engine)
  private moveTarget: BABYLON.Vector3 | null = null;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    scene: BABYLON.Scene,
    playerRoot: BABYLON.TransformNode,
    getCamera: () => BABYLON.FollowCamera | null,
    callbacks: PlayerControllerCallbacks = {}
  ) {
    this.scene = scene;
    this.playerRoot = playerRoot;
    this.getCamera = getCamera;
    this.callbacks = callbacks;

    this.keyDownHandler = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;

      // Any manual key movement cancels a tap-to-move target
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        this.moveTarget = null;
      }

      // Jump on space
      if (e.key === ' ' && !this.isJumping) {
        this.isJumping = true;
        this.jumpVelocity = 0.25;
      }

      // E key to interact (portal / station proximity is the engine's job)
      if ((e.key === 'e' || e.key === 'E') && this.callbacks.onInteractKey) {
        this.callbacks.onInteractKey();
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  public setMoveTarget(target: BABYLON.Vector3 | null): void {
    this.moveTarget = target ? target.clone() : null;
    if (this.moveTarget) {
      this.moveTarget.y = this.playerRoot.position.y;
    }
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public update(): void {
    const camera = this.getCamera();
    if (!camera) return;

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveZ = 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ = -1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX = -1;
    if (this.keys['d'] || this.keys['arrowright']) moveX = 1;

    const hasKeyInput = moveX !== 0 || moveZ !== 0;
    this.isMoving = hasKeyInput || this.moveTarget !== null;

    if (hasKeyInput) {
      const cameraDirection = camera.getDirection(BABYLON.Axis.Z);
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
    } else if (this.moveTarget) {
      const toTarget = this.moveTarget.subtract(this.playerRoot.position);
      toTarget.y = 0;
      const distance = toTarget.length();

      if (distance < 0.25) {
        this.moveTarget = null;
        this.isMoving = false;
      } else {
        toTarget.normalize().scaleInPlace(Math.min(this.playerSpeed, distance));
        this.playerRoot.position.addInPlace(toTarget);
        this.playerRoot.rotation.y = Math.atan2(toTarget.x, toTarget.z);
        this.walkCycle += 0.15;
        this.animateWalk();
      }
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
    this.playerRoot.position.x = Math.max(-this.bounds, Math.min(this.bounds, this.playerRoot.position.x));
    this.playerRoot.position.z = Math.max(-this.bounds, Math.min(this.bounds, this.playerRoot.position.z));
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

  public dispose(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }
}
