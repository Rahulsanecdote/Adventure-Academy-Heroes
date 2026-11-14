import * as BABYLON from '@babylonjs/core';

// ---------------------------------------------------------------------------
// Third-person player controller: WASD / arrow-key movement relative to the
// follow camera, space to jump, E to interact, tap-to-move targets from
// pointer picks, and an analog virtual joystick (touch devices).
//
// Motion is REAL physics now:
// - All speeds are per-second and scaled by the frame's delta time, so the
//   character moves at the same speed on a 120 Hz phone, a 60 Hz laptop and
//   a struggling 30 fps tablet. (Previously every constant was per-frame,
//   so a 120 Hz phone ran the character at double speed.)
// - Horizontal displacement goes through Babylon's collision system
//   (collider.moveWithCollisions), so the character actually stops at
//   trees, NPCs and totems instead of walking through them. (Previously
//   position.addInPlace bypassed collisions entirely — the colliders the
//   engine created were never used.)
// - Turning is smoothed (shortest-arc lerp) instead of snapping.
// ---------------------------------------------------------------------------

export interface PlayerControllerCallbacks {
  onInteractKey?: () => void;
}

// Per-second equivalents of the old per-frame constants (tuned at 60 fps):
const WALK_SPEED = 8; // units/sec   (was 0.15/frame at 9; eased to 8 with smoothing)
const JUMP_VELOCITY = 15; // units/sec (was 0.25/frame)
const GRAVITY = -54; // units/sec^2    (was -0.015/frame^2)
const WALK_CYCLE_RATE = 9; // rad/sec    (was 0.15/frame)
const TURN_RATE = 14; // smoothing rate for facing turns
const JOYSTICK_DEADZONE = 0.15;
const COLLIDER_Y_OFFSET = 0.95; // capsule centre above the player's feet

export class PlayerController {
  private scene: BABYLON.Scene;
  private playerRoot: BABYLON.TransformNode;
  private collider: BABYLON.Mesh;
  private getCamera: () => BABYLON.ArcRotateCamera | null;
  private callbacks: PlayerControllerCallbacks;

  // Smoothed horizontal velocity (units/sec). Input sets a DESIRED
  // velocity; the actual velocity eases toward it, so starts, stops and
  // direction changes glide instead of snapping — the "uncomfortable
  // motion" fix. Facing and the walk cycle follow the real velocity.
  private velocity = new BABYLON.Vector3();

  private keys: { [key: string]: boolean } = {};
  private isJumping = false;
  private jumpVelocity = 0;
  private groundLevel = 0;
  private bounds = 28;

  private isMoving = false;
  private idleTime = 0;
  private walkCycle = 0;

  // Tap-to-move target (set by pointer picking in the engine)
  private moveTarget: BABYLON.Vector3 | null = null;

  // Virtual joystick input (touch): x = strafe (-1..1), y = forward (-1..1)
  private joystickX = 0;
  private joystickY = 0;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    scene: BABYLON.Scene,
    playerRoot: BABYLON.TransformNode,
    collider: BABYLON.Mesh,
    getCamera: () => BABYLON.ArcRotateCamera | null,
    callbacks: PlayerControllerCallbacks = {}
  ) {
    this.scene = scene;
    this.playerRoot = playerRoot;
    this.collider = collider;
    this.getCamera = getCamera;
    this.callbacks = callbacks;

    this.keyDownHandler = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = true;

      // Any manual key movement cancels a tap-to-move target
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        this.moveTarget = null;
      }

      // Jump on space
      if (e.key === ' ') {
        this.jump();
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

  /** Analog joystick input from the touch HUD. Any real deflection takes
   *  over from (and cancels) a tap-to-move target. */
  public setJoystickInput(x: number, y: number): void {
    this.joystickX = x;
    this.joystickY = y;
    if (Math.abs(x) > JOYSTICK_DEADZONE || Math.abs(y) > JOYSTICK_DEADZONE) {
      this.moveTarget = null;
    }
  }

  public jump(): void {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = JUMP_VELOCITY;
    }
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public update(dt: number): void {
    const camera = this.getCamera();
    if (!camera) return;
    // Clamp dt so a backgrounded tab doesn't teleport the player on return.
    const step = Math.min(Math.max(dt, 0), 0.05);

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveZ = 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ = -1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX = -1;
    if (this.keys['d'] || this.keys['arrowright']) moveX = 1;

    // Joystick: analog — deflection magnitude scales speed.
    let joyMagnitude = 0;
    if (Math.abs(this.joystickX) > JOYSTICK_DEADZONE || Math.abs(this.joystickY) > JOYSTICK_DEADZONE) {
      moveX += this.joystickX;
      moveZ += this.joystickY;
      joyMagnitude = Math.min(1, Math.hypot(this.joystickX, this.joystickY));
    }

    const hasDirectInput = moveX !== 0 || moveZ !== 0;

    // Camera-relative ground-plane basis
    const cameraDirection = camera.getDirection(BABYLON.Axis.Z);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    const cameraRight = BABYLON.Vector3.Cross(cameraDirection, BABYLON.Axis.Y);

    // 1) Desired velocity from the active input source (units/sec).
    const desired = new BABYLON.Vector3();
    if (hasDirectInput) {
      const input = new BABYLON.Vector3(moveX, 0, moveZ);
      const inputLength = input.length();
      if (inputLength > 1) input.scaleInPlace(1 / inputLength);
      // Keyboard input is full strength; joystick deflection scales speed.
      const strength = Math.max(joyMagnitude, Math.min(1, inputLength));

      const movement = cameraDirection
        .scale(input.z)
        .add(cameraRight.scale(-input.x));
      if (movement.lengthSquared() > 0.0001) {
        movement.normalize();
        desired.copyFrom(movement.scale(WALK_SPEED * strength));
      }
    } else if (this.moveTarget) {
      const toTarget = this.moveTarget.subtract(this.playerRoot.position);
      toTarget.y = 0;
      const distance = toTarget.length();

      if (distance < 0.3) {
        this.moveTarget = null;
      } else {
        // Ease into the target over the last ~1.2 units instead of
        // arriving at full speed and stopping dead.
        const arriveScale = Math.min(1, Math.max(0.25, distance / 1.2));
        desired.copyFrom(toTarget.normalize().scale(WALK_SPEED * arriveScale));
      }
    }

    // 2) Ease the real velocity toward the desired one. ~10/s blend:
    // responsive, but starts/stops/turns glide over ~200 ms instead of
    // snapping — this is most of the "smooth motion" feel.
    const blend = 1 - Math.exp(-10 * step);
    this.velocity.x += (desired.x - this.velocity.x) * blend;
    this.velocity.z += (desired.z - this.velocity.z) * blend;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!hasDirectInput && !this.moveTarget && speed < 0.12) {
      this.velocity.set(0, 0, 0);
    }
    const activeSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.isMoving = hasDirectInput || this.moveTarget !== null || activeSpeed > 0.35;

    // 3) Animate + face along the REAL velocity, and move through the
    // collision solver (trees/NPCs/totems stop the capsule; vertical
    // jump/gravity stays scripted below).
    if (activeSpeed > 0.05) {
      this.walkCycle += WALK_CYCLE_RATE * step * (activeSpeed / WALK_SPEED);
      this.animateWalk();

      if (activeSpeed > 0.5) {
        const facingAngle = Math.atan2(this.velocity.x, this.velocity.z);
        let delta = facingAngle - this.playerRoot.rotation.y;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        const t = 1 - Math.exp(-TURN_RATE * step);
        this.playerRoot.rotation.y += delta * t;
      }

      const displacement = this.velocity.scale(step);
      this.collider.position.set(
        this.playerRoot.position.x,
        this.playerRoot.position.y + COLLIDER_Y_OFFSET,
        this.playerRoot.position.z
      );
      this.collider.moveWithCollisions(displacement);
      this.playerRoot.position.x = this.collider.position.x;
      this.playerRoot.position.z = this.collider.position.z;
    } else {
      this.idleTime += step;
      this.animateIdle();
    }

    // Handle jumping (per-second gravity)
    if (this.isJumping) {
      this.playerRoot.position.y += this.jumpVelocity * step;
      this.jumpVelocity += GRAVITY * step;

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
