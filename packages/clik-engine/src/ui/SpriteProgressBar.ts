import Phaser from 'phaser';

export interface SpriteProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Texture key for the track / background bar frame. */
  trackTexture: string;
  /** Texture key for the fill bar. */
  fillTexture: string;
  /** 9-slice insets for the track sprite (optional — uses setDisplaySize if omitted). */
  trackNineSlice?: { left: number; right: number; top: number; bottom: number };
  /** 9-slice insets for the fill sprite (optional). */
  fillNineSlice?: { left: number; right: number; top: number; bottom: number };
  /** Current value 0-1 (default `0`). */
  value?: number;
  /** Tween value changes (default `false`). */
  animateOnChange?: boolean;
  /** Tween duration in ms (default `200`). */
  animateDuration?: number;
  /** Optional tint applied to the fill sprite. */
  fillTint?: number;
}

/**
 * A progress bar whose track and fill are sprite textures (optionally
 * 9-sliced) instead of plain rectangles.  Ideal for pixel-art UI packs.
 *
 * The fill sprite is cropped (not scaled) so pixel art stays crisp.
 */
export class SpriteProgressBar extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Image;
  private fill: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Image;
  private barWidth: number;
  private barHeight: number;
  private _value: number;
  private barConfig: SpriteProgressBarConfig;

  constructor(scene: Phaser.Scene, config: SpriteProgressBarConfig) {
    super(scene, config.x, config.y);
    this.barConfig = config;
    this.barWidth = config.width;
    this.barHeight = config.height;
    this._value = Phaser.Math.Clamp(config.value ?? 0, 0, 1);

    // ── Track (background) ──────────────────────────────────
    if (config.trackNineSlice) {
      const ns = config.trackNineSlice;
      this.track = scene.add.nineslice(
        0, 0, config.trackTexture, undefined,
        config.width, config.height,
        ns.left, ns.right, ns.top, ns.bottom,
      ).setOrigin(0, 0.5);
    } else {
      this.track = scene.add.image(0, 0, config.trackTexture)
        .setDisplaySize(config.width, config.height)
        .setOrigin(0, 0.5);
    }

    // ── Fill ────────────────────────────────────────────────
    const fillW = Math.max(1, config.width * this._value);
    if (config.fillNineSlice) {
      const ns = config.fillNineSlice;
      this.fill = scene.add.nineslice(
        0, 0, config.fillTexture, undefined,
        fillW, config.height,
        ns.left, ns.right, ns.top, ns.bottom,
      ).setOrigin(0, 0.5);
    } else {
      this.fill = scene.add.image(0, 0, config.fillTexture)
        .setDisplaySize(fillW, config.height)
        .setOrigin(0, 0.5);
    }

    if (config.fillTint !== undefined) {
      this.fill.setTint(config.fillTint);
    }

    this.add([this.track, this.fill]);
    this.applyFillWidth();

    scene.add.existing(this);
  }

  // ── Public API ────────────────────────────────────────────

  get value(): number {
    return this._value;
  }

  setValue(value: number, animate?: boolean): this {
    const newValue = Phaser.Math.Clamp(value, 0, 1);
    const shouldAnimate = animate ?? this.barConfig.animateOnChange ?? false;

    if (shouldAnimate && this.scene) {
      this.scene.tweens.add({
        targets: this,
        _value: newValue,
        duration: this.barConfig.animateDuration ?? 200,
        onUpdate: () => this.applyFillWidth(),
      });
    } else {
      this._value = newValue;
      this.applyFillWidth();
    }

    return this;
  }

  /** Change the fill tint at runtime (e.g. green → gold when complete). */
  setFillTint(tint: number): this {
    this.fill.setTint(tint);
    return this;
  }

  /** Clear fill tint. */
  clearFillTint(): this {
    this.fill.clearTint();
    return this;
  }

  // ── Internal ──────────────────────────────────────────────

  private applyFillWidth(): void {
    const w = Math.max(1, this.barWidth * this._value);

    if (this.fill instanceof Phaser.GameObjects.NineSlice) {
      this.fill.setSize(w, this.barHeight);
    } else {
      this.fill.setDisplaySize(w, this.barHeight);
    }
  }
}
