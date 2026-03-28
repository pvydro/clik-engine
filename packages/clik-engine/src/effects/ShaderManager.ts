import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Post-processing effects manager using Phaser's FX pipeline.
 * Requires Phaser 3.60+ with WebGL renderer.
 */
export class ShaderManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /** Apply a blur effect to the camera */
  blur(quality = 0, strength = 1): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addBlur(quality, strength, strength);
    ConsoleReporter.engine('Effect: blur applied');
    return this;
  }

  /** Apply a bloom/glow effect */
  bloom(color = 0xffffff, strength = 1, blurStrength = 1): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addBloom(color, strength, blurStrength);
    ConsoleReporter.engine('Effect: bloom applied');
    return this;
  }

  /** Apply a vignette effect */
  vignette(x = 0.5, y = 0.5, radius = 0.5, strength = 0.5): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addVignette(x, y, radius, strength);
    ConsoleReporter.engine('Effect: vignette applied');
    return this;
  }

  /** Apply a pixelate effect */
  pixelate(amount = 4): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addPixelate(amount);
    ConsoleReporter.engine('Effect: pixelate applied');
    return this;
  }

  /** Apply a color tint/shift */
  colorMatrix(): Phaser.FX.ColorMatrix | null {
    if (!this.hasFX()) return null;
    return this.camera.postFX.addColorMatrix();
  }

  /** Apply barrel distortion (CRT-like) */
  barrel(amount = 1): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addBarrel(amount);
    ConsoleReporter.engine('Effect: barrel distortion applied');
    return this;
  }

  /** Apply a gradient effect */
  gradient(color1 = 0xff0000, color2 = 0x0000ff, alpha = 0.2, size = 0): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addGradient(color1, color2, alpha, undefined, undefined, undefined, size);
    ConsoleReporter.engine('Effect: gradient applied');
    return this;
  }

  /** Apply a displacement effect */
  displacement(key: string, x = 1, y = 1): this {
    if (!this.hasFX()) return this;
    this.camera.postFX.addDisplacement(key, x, y);
    ConsoleReporter.engine('Effect: displacement applied');
    return this;
  }

  /** Apply a wipe/reveal effect */
  wipe(progress = 0, direction = 0): Phaser.FX.Wipe | null {
    if (!this.hasFX()) return null;
    return this.camera.postFX.addWipe(progress, direction);
  }

  /** Remove all post-processing effects */
  clearAll(): this {
    if (this.camera.postFX) {
      this.camera.postFX.clear();
      ConsoleReporter.engine('Effects cleared');
    }
    return this;
  }

  /** Apply effect to a specific game object instead of camera */
  applyToObject(obj: Phaser.GameObjects.GameObject): {
    blur: (quality?: number, strength?: number) => void;
    bloom: (color?: number, strength?: number) => void;
    glow: (color?: number, distance?: number, quality?: number) => void;
    shadow: (x?: number, y?: number, decay?: number, power?: number) => void;
    clear: () => void;
  } {
    const go = obj as Phaser.GameObjects.Components.FX;
    if (!go.preFX && !go.postFX) {
      ConsoleReporter.error('Object does not support FX');
      return { blur: () => {}, bloom: () => {}, glow: () => {}, shadow: () => {}, clear: () => {} };
    }

    return {
      blur: (q = 0, s = 1) => go.postFX?.addBlur(q, s, s),
      bloom: (c = 0xffffff, s = 1) => go.postFX?.addBloom(c, s),
      glow: (c = 0xffffff, d = 16, q = 0.1) => go.postFX?.addGlow(c, d, 0, false, q),
      shadow: (x = 2, y = 2, d = 0.1, p = 1) => go.postFX?.addShadow(x, y, d, p),
      clear: () => go.postFX?.clear(),
    };
  }

  private hasFX(): boolean {
    if (!this.camera.postFX) {
      ConsoleReporter.error('PostFX not available (requires WebGL renderer)');
      return false;
    }
    return true;
  }
}
