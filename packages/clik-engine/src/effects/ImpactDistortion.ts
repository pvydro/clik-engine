import Phaser from 'phaser';

export interface ImpactDistortionConfig {
  /** Maximum radius of the ripple in pixels */
  radius?: number;
  /** Expansion speed in pixels/sec */
  speed?: number;
  /** Intensity of distortion (0-1) */
  intensity?: number;
  /** Duration in ms */
  duration?: number;
}

/**
 * Screen-space ripple distortion from a world position.
 * Uses Phaser's barrel distortion as a lightweight approximation.
 *
 * Usage:
 * ```
 * const distortion = new ImpactDistortion(scene);
 * distortion.trigger(worldX, worldY, { intensity: 0.5, duration: 300 });
 * ```
 */
export class ImpactDistortion {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Trigger a ripple distortion at a world position */
  trigger(worldX: number, worldY: number, config?: ImpactDistortionConfig): void {
    const duration = config?.duration ?? 300;
    const intensity = config?.intensity ?? 0.3;
    const cam = this.scene.cameras.main;

    // Use barrel distortion as ripple approximation
    const fx = cam.postFX?.addBarrel?.(intensity);
    if (!fx) return;

    this.scene.tweens.add({
      targets: fx,
      amount: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        cam.postFX?.remove(fx);
      },
    });
  }

  /** Get the intensity parameter for a given distance from impact center */
  static falloff(distance: number, maxRadius: number, intensity: number): number {
    if (distance >= maxRadius) return 0;
    const t = 1 - distance / maxRadius;
    return intensity * t * t;
  }
}
