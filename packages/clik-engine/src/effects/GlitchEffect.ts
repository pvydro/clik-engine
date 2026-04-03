import Phaser from 'phaser';

export interface GlitchConfig {
  /** Duration in ms */
  duration?: number;
  /** Intensity of displacement (0-1) */
  intensity?: number;
}

/**
 * Screen glitch effect: pixelation + color shift for cyberpunk/corruption themes.
 *
 * Usage:
 * ```
 * const glitch = new GlitchEffect(scene);
 * glitch.trigger({ duration: 200, intensity: 0.5 });
 * ```
 */
export class GlitchEffect {
  private scene: Phaser.Scene;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Trigger a glitch effect */
  trigger(config?: GlitchConfig): void {
    if (this.active) return;
    this.active = true;

    const duration = config?.duration ?? 200;
    const intensity = config?.intensity ?? 0.5;
    const cam = this.scene.cameras.main;

    // Combine pixelate + color matrix for glitch look
    const pixelAmount = Math.round(2 + intensity * 8);
    const pixFx = cam.postFX?.addPixelate?.(pixelAmount);
    const colorFx = cam.postFX?.addColorMatrix?.();

    if (colorFx) {
      colorFx.hue(intensity * 30);
    }

    this.scene.time.delayedCall(duration, () => {
      if (pixFx) cam.postFX?.remove(pixFx);
      if (colorFx) cam.postFX?.remove(colorFx as unknown as Phaser.FX.Controller);
      this.active = false;
    });
  }

  get isActive(): boolean {
    return this.active;
  }
}
