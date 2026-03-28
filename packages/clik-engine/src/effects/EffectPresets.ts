import Phaser from 'phaser';
import { ShaderManager } from './ShaderManager';

/**
 * Pre-built visual effect combinations for common game scenarios.
 */
export const EffectPresets = {
  /** CRT monitor effect — scanlines + barrel distortion + vignette */
  crt(fx: ShaderManager): void {
    fx.barrel(1.2);
    fx.vignette(0.5, 0.5, 0.5, 0.4);
  },

  /** Dream/flashback — bloom + blur + vignette */
  dream(fx: ShaderManager): void {
    fx.bloom(0xffffff, 0.5, 0.5);
    fx.blur(0, 0.5);
    fx.vignette(0.5, 0.5, 0.5, 0.6);
  },

  /** Underwater — blue tint + blur + vignette */
  underwater(fx: ShaderManager): void {
    const cm = fx.colorMatrix();
    if (cm) {
      cm.brightness(0.9);
    }
    fx.blur(0, 0.3);
    fx.vignette(0.5, 0.5, 0.4, 0.5);
  },

  /** Night vision — green tint + vignette + pixelate */
  nightVision(fx: ShaderManager): void {
    const cm = fx.colorMatrix();
    if (cm) {
      cm.brightness(1.2);
    }
    fx.vignette(0.5, 0.5, 0.3, 0.7);
  },

  /** Damage — red vignette + slight blur */
  damage(fx: ShaderManager): void {
    fx.vignette(0.5, 0.5, 0.5, 0.8);
  },

  /** Frozen/pause — desaturate + blur */
  frozen(fx: ShaderManager): void {
    const cm = fx.colorMatrix();
    if (cm) {
      cm.saturate(-1);
      cm.brightness(0.8);
    }
    fx.blur(0, 0.5);
  },

  /** Retro/pixel art — pixelate */
  retro(fx: ShaderManager, pixelSize = 4): void {
    fx.pixelate(pixelSize);
  },

  /** Bloom glow — subtle bloom for neon/magical scenes */
  glow(fx: ShaderManager, color = 0xffffff, strength = 0.8): void {
    fx.bloom(color, strength, 0.5);
  },

  /**
   * Animate a transition effect (wipe, dissolve) between 0→1.
   * Returns the FX object for manual control if needed.
   */
  transitionWipe(scene: Phaser.Scene, duration = 500, direction = 0): Promise<void> {
    const cam = scene.cameras.main;
    if (!cam.postFX) return Promise.resolve();

    const wipe = cam.postFX.addWipe(0, direction);
    return new Promise(resolve => {
      scene.tweens.add({
        targets: wipe,
        progress: 1,
        duration,
        onComplete: () => {
          cam.postFX.remove(wipe);
          resolve();
        },
      });
    });
  },

  /** Animate a reveal (opposite of wipe) */
  transitionReveal(scene: Phaser.Scene, duration = 500, direction = 0): Promise<void> {
    const cam = scene.cameras.main;
    if (!cam.postFX) return Promise.resolve();

    const wipe = cam.postFX.addReveal(0.1, direction);
    return new Promise(resolve => {
      scene.tweens.add({
        targets: wipe,
        progress: 1,
        duration,
        onComplete: () => {
          cam.postFX.remove(wipe);
          resolve();
        },
      });
    });
  },
};
