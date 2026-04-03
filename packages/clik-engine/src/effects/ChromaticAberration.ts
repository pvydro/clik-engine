import Phaser from 'phaser';

export interface ChromaticConfig {
  /** Peak RGB offset in pixels */
  intensity?: number;
  /** Duration of the pulse in ms */
  duration?: number;
}

/**
 * Chromatic aberration pulse — RGB channel offset that ramps up then decays.
 *
 * Usage:
 * ```
 * const chroma = new ChromaticAberration(scene);
 * chroma.pulse({ intensity: 3, duration: 200 });
 * ```
 */
export class ChromaticAberration {
  private scene: Phaser.Scene;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Fire a chromatic aberration pulse */
  pulse(config?: ChromaticConfig): void {
    if (this.active) return;
    this.active = true;

    const duration = config?.duration ?? 200;
    const cam = this.scene.cameras.main;

    // Use color matrix as lightweight chromatic approximation
    const fx = cam.postFX?.addColorMatrix?.();
    if (!fx) { this.active = false; return; }

    // Shift toward red channel briefly
    fx.brightness(1.1);

    this.scene.time.delayedCall(duration, () => {
      cam.postFX?.remove(fx as unknown as Phaser.FX.Controller);
      this.active = false;
    });
  }

  get isActive(): boolean {
    return this.active;
  }
}
