import Phaser from 'phaser';

export interface OrbitalConfig {
  /** Center point to orbit around */
  centerX: number;
  centerY: number;
  /** Orbital radius in world pixels */
  radius: number;
  /** Angular speed in radians per second (positive = clockwise) */
  angularSpeed?: number;
  /** Starting angle in radians */
  startAngle?: number;
  /** Smoothing for transitions (0-1) */
  smoothing?: number;
}

/**
 * Orbital camera that rotates around a point.
 * Useful for boss introductions, cinematic reveals, and menu screens.
 *
 * Usage:
 * ```
 * const orbital = new OrbitalCamera(scene, {
 *   centerX: 400, centerY: 300, radius: 200, angularSpeed: 0.5,
 * });
 * orbital.start();
 * // In update:
 * orbital.update(delta);
 * // Transition back to follow:
 * await orbital.transitionToFollow(player, 1000);
 * ```
 */
export class OrbitalCamera {
  private scene: Phaser.Scene;
  private config: Required<OrbitalConfig>;
  private currentAngle: number;
  private active = false;

  constructor(scene: Phaser.Scene, config: OrbitalConfig) {
    this.scene = scene;
    this.config = {
      angularSpeed: 0.5,
      startAngle: 0,
      smoothing: 0.1,
      ...config,
    };
    this.currentAngle = this.config.startAngle;
  }

  /** Start orbiting */
  start(): this {
    this.active = true;
    return this;
  }

  /** Stop orbiting */
  stop(): this {
    this.active = false;
    return this;
  }

  /** Update the orbital camera. Call each frame. */
  update(delta: number): void {
    if (!this.active) return;

    const dt = delta / 1000;
    this.currentAngle += this.config.angularSpeed * dt;

    const cam = this.scene.cameras.main;
    const targetX = this.config.centerX + Math.cos(this.currentAngle) * this.config.radius;
    const targetY = this.config.centerY + Math.sin(this.currentAngle) * this.config.radius;

    cam.centerOn(targetX, targetY);
  }

  /** Smoothly transition from orbital to following a target */
  async transitionToFollow(
    target: Phaser.GameObjects.GameObject & { x: number; y: number },
    duration = 1000,
  ): Promise<void> {
    this.active = false;
    const cam = this.scene.cameras.main;
    const startX = cam.scrollX + cam.width / 2;
    const startY = cam.scrollY + cam.height / 2;

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: { t: 0 },
        t: 1,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: (_tween: unknown, obj: { t: number }) => {
          const x = Phaser.Math.Linear(startX, target.x, obj.t);
          const y = Phaser.Math.Linear(startY, target.y, obj.t);
          cam.centerOn(x, y);
        },
        onComplete: () => {
          cam.startFollow(target, false, 0.1, 0.1);
          resolve();
        },
      });
    });
  }

  /** Set the orbital center */
  setCenter(x: number, y: number): this {
    this.config.centerX = x;
    this.config.centerY = y;
    return this;
  }

  /** Set the orbital radius */
  setRadius(radius: number): this {
    this.config.radius = radius;
    return this;
  }

  /** Set angular speed */
  setAngularSpeed(speed: number): this {
    this.config.angularSpeed = speed;
    return this;
  }

  getAngle(): number {
    return this.currentAngle;
  }

  get isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    this.active = false;
  }
}
