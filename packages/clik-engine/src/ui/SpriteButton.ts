import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface SpriteButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  /** Text outline color for readability on dark/busy backgrounds. */
  textStroke?: string;
  /** Text outline thickness (default 0 — no stroke). */
  textStrokeThickness?: number;
  /** Base texture key used for the unpressed/default state. */
  texture: string;
  /** Texture key shown on pointer hover (falls back to `texture`). */
  hoverTexture?: string;
  /** Texture key shown while pressed (falls back to `texture`). */
  pressTexture?: string;
  /** Texture key shown when disabled (falls back to `texture`). */
  disabledTexture?: string;
  /**
   * If provided the background is rendered as a Phaser NineSlice that
   * stretches cleanly to any size.  When omitted the sprite is simply
   * scaled via `setDisplaySize`.
   */
  nineSlice?: { left: number; right: number; top: number; bottom: number };
  /** Optional icon texture key rendered beside the label. */
  icon?: string;
  iconFrame?: string | number;
  /** Which side of the label the icon sits on (default `'left'`). */
  iconPosition?: 'left' | 'right';
  /** Gap in px between icon and label (default `8`). */
  iconSpacing?: number;
  /** Click / tap callback. */
  onClick?: () => void;
}

/**
 * A button whose background is a sprite (or 9-slice sprite) instead of a
 * solid-color rectangle.  Swaps textures on hover / press for pixel-perfect
 * state feedback.
 *
 * API surface mirrors {@link Button} so it can be used as a drop-in
 * replacement.
 */
export class SpriteButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private iconSprite: Phaser.GameObjects.Image | null = null;
  private btnConfig: SpriteButtonConfig;
  private isHovered = false;
  private isPressed = false;
  private _enabled = true;

  constructor(scene: Phaser.Scene, config: SpriteButtonConfig) {
    super(scene, config.x, config.y);
    this.btnConfig = config;

    const w = config.width ?? 180;
    const h = config.height ?? 48;

    // ── Background ──────────────────────────────────────────
    if (config.nineSlice) {
      const ns = config.nineSlice;
      this.bg = scene.add.nineslice(
        0, 0,
        config.texture,
        undefined,
        w, h,
        ns.left, ns.right, ns.top, ns.bottom,
      ).setOrigin(0.5);
    } else {
      this.bg = scene.add.image(0, 0, config.texture)
        .setDisplaySize(w, h)
        .setOrigin(0.5);
    }

    // ── Icon ────────────────────────────────────────────────
    let textOffsetX = 0;
    if (config.icon) {
      const iconPos = config.iconPosition ?? 'left';
      const spacing = config.iconSpacing ?? 8;
      const iconX = iconPos === 'left' ? -w / 4 : w / 4;
      textOffsetX = iconPos === 'left' ? spacing : -spacing;

      this.iconSprite = scene.add.image(iconX, 0, config.icon, config.iconFrame)
        .setDisplaySize(h * 0.5, h * 0.5);
      this.add(this.iconSprite);
    }

    // ── Label ───────────────────────────────────────────────
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: config.fontSize ?? '18px',
      fontFamily: config.fontFamily ?? 'monospace',
      color: config.color ?? '#ffffff',
    };
    if (config.textStroke) {
      textStyle.stroke = config.textStroke;
      textStyle.strokeThickness = config.textStrokeThickness ?? 2;
    }

    this.label = scene.add.text(textOffsetX, 0, config.text, textStyle)
      .setOrigin(0.5);

    // ── Assembly ────────────────────────────────────────────
    this.add([this.bg, this.label]);
    if (this.iconSprite) this.bringToTop(this.iconSprite);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    // ── Pointer events ──────────────────────────────────────
    this.on('pointerover', () => {
      if (!this._enabled) return;
      this.isHovered = true;
      this.bg.setTexture(config.hoverTexture ?? config.texture);
    });

    this.on('pointerout', () => {
      if (!this._enabled) return;
      this.isHovered = false;
      this.isPressed = false;
      this.bg.setTexture(config.texture);
    });

    this.on('pointerdown', () => {
      if (!this._enabled) return;
      this.isPressed = true;
      this.bg.setTexture(config.pressTexture ?? config.texture);
      this.setScale(0.96);
    });

    this.on('pointerup', () => {
      if (!this._enabled) return;
      this.setScale(1);
      if (this.isPressed) {
        this.isPressed = false;
        this.bg.setTexture(
          this.isHovered
            ? (config.hoverTexture ?? config.texture)
            : config.texture,
        );
        ConsoleReporter.input(`sprite-button clicked: ${config.text}`);
        config.onClick?.();
        this.emit('click');
      }
    });

    scene.add.existing(this);
  }

  // ── Public API (mirrors Button) ───────────────────────────

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  getText(): string {
    return this.label.text;
  }

  setEnabled(enabled: boolean): this {
    this._enabled = enabled;
    if (enabled) {
      this.setInteractive({ useHandCursor: true });
      this.setAlpha(1);
      this.bg.setTexture(this.btnConfig.texture);
    } else {
      this.disableInteractive();
      this.setAlpha(0.5);
      this.bg.setTexture(this.btnConfig.disabledTexture ?? this.btnConfig.texture);
    }
    return this;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  /** Swap the base (unpressed) texture at runtime. */
  setTexture(key: string): this {
    this.btnConfig.texture = key;
    this.bg.setTexture(key);
    return this;
  }
}
