import Phaser from 'phaser';

export interface MotionBlurConfig {
  /** Velocity threshold to start blur (pixels/sec) */
  threshold?: number;
  /** Maximum blur intensity */
  maxIntensity?: number;
  /** Smoothing for blur changes */
  smoothing?: number;
}

/**
 * Directional motion blur based on camera or entity velocity.
 *
 * Usage:
 * ```
 * const blur = new MotionBlur(scene, { threshold: 200, maxIntensity: 0.5 });
 * // In update:
 * blur.update(cameraVelX, cameraVelY, delta);
 * ```
 */
export class MotionBlur {
  private scene: Phaser.Scene;
  private config: Required<MotionBlurConfig>;
  private currentIntensity = 0;
  private fx: Phaser.FX.Blur | null = null;

  constructor(scene: Phaser.Scene, config?: MotionBlurConfig) {
    this.scene = scene;
    this.config = {
      threshold: config?.threshold ?? 200,
      maxIntensity: config?.maxIntensity ?? 2,
      smoothing: config?.smoothing ?? 0.1,
    };
  }

  /** Update blur based on velocity. Call each frame. */
  update(velocityX: number, velocityY: number, _delta: number): void {
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    const targetIntensity = speed > this.config.threshold
      ? Math.min(this.config.maxIntensity, (speed - this.config.threshold) / 500)
      : 0;

    this.currentIntensity += (targetIntensity - this.currentIntensity) * this.config.smoothing;

    if (this.currentIntensity > 0.01) {
      if (!this.fx) {
        this.fx = this.scene.cameras.main.postFX?.addBlur?.(0, 0, 0, this.currentIntensity) ?? null;
      }
      if (this.fx) {
        this.fx.strength = this.currentIntensity;
      }
    } else if (this.fx) {
      this.scene.cameras.main.postFX?.remove(this.fx);
      this.fx = null;
    }
  }

  /** Get current blur intensity */
  getIntensity(): number {
    return this.currentIntensity;
  }

  /** Force-disable blur */
  disable(): void {
    if (this.fx) {
      this.scene.cameras.main.postFX?.remove(this.fx);
      this.fx = null;
    }
    this.currentIntensity = 0;
  }

  /** Compute blur direction from velocity */
  static direction(vx: number, vy: number): { angle: number; strength: number } {
    return {
      angle: Math.atan2(vy, vx),
      strength: Math.sqrt(vx * vx + vy * vy),
    };
  }
}
