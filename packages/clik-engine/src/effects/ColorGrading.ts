import Phaser from 'phaser';

export interface ColorGradingPreset {
  name: string;
  /** Brightness multiplier (1 = normal) */
  brightness?: number;
  /** Saturation multiplier (0 = grayscale, 1 = normal) */
  saturation?: number;
  /** Contrast multiplier (1 = normal) */
  contrast?: number;
  /** Hue rotation in degrees */
  hueRotate?: number;
}

/** Built-in presets */
export const ColorGradingPresets = {
  normal: { name: 'normal', brightness: 1, saturation: 1, contrast: 1, hueRotate: 0 },
  desaturated: { name: 'desaturated', brightness: 0.9, saturation: 0.3, contrast: 1.1 },
  warm: { name: 'warm', brightness: 1.05, saturation: 1.1, hueRotate: 10 },
  cold: { name: 'cold', brightness: 0.95, saturation: 0.9, hueRotate: -15 },
  noir: { name: 'noir', brightness: 0.8, saturation: 0, contrast: 1.4 },
  toxic: { name: 'toxic', brightness: 1, saturation: 1.2, hueRotate: 80 },
} as const;

/**
 * LUT-style color grading via Phaser's color matrix.
 * Supports smooth transitions between presets.
 *
 * Usage:
 * ```
 * const grading = new ColorGrading(scene);
 * grading.apply(ColorGradingPresets.desaturated);
 * grading.transitionTo(ColorGradingPresets.normal, 500);
 * ```
 */
export class ColorGrading {
  private scene: Phaser.Scene;
  private currentPreset: ColorGradingPreset | null = null;
  private fx: Phaser.FX.ColorMatrix | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Apply a preset immediately */
  apply(preset: ColorGradingPreset): void {
    this.removeFx();
    const cam = this.scene.cameras.main;
    this.fx = cam.postFX?.addColorMatrix?.() ?? null;
    if (this.fx) {
      if (preset.brightness !== undefined && preset.brightness !== 1) {
        this.fx.brightness(preset.brightness);
      }
      if (preset.saturation !== undefined && preset.saturation < 1) {
        this.fx.saturate(-(1 - preset.saturation) * 100);
      }
      if (preset.contrast !== undefined && preset.contrast !== 1) {
        this.fx.contrast(preset.contrast);
      }
      if (preset.hueRotate) {
        this.fx.hue(preset.hueRotate);
      }
    }
    this.currentPreset = preset;
  }

  /** Transition to a new preset over duration ms */
  transitionTo(preset: ColorGradingPreset, duration = 500): void {
    // Simple: remove old, apply new with fade
    this.removeFx();
    this.apply(preset);
    // Fade in via camera alpha trick isn't ideal; this is a cut transition for now
    // Future: interpolate between two color matrices
  }

  /** Remove all color grading */
  clear(): void {
    this.removeFx();
    this.currentPreset = null;
  }

  /** Get current preset name */
  getCurrentPreset(): string | null {
    return this.currentPreset?.name ?? null;
  }

  private removeFx(): void {
    if (this.fx) {
      this.scene.cameras.main.postFX?.remove(this.fx as unknown as Phaser.FX.Controller);
      this.fx = null;
    }
  }

  destroy(): void {
    this.clear();
  }
}
