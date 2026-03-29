import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface ButtonConfig {
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
  backgroundColor?: number;
  hoverColor?: number;
  pressColor?: number;
  disabledColor?: number;
  borderColor?: number;
  borderWidth?: number;
  /**
   * Corner radius for the background rectangle.  When > 0 a Graphics
   * object with `fillRoundedRect` is used instead of a plain Rectangle.
   */
  borderRadius?: number;
  icon?: string; // texture key for icon
  iconFrame?: string | number;
  iconPosition?: 'left' | 'right';
  iconSpacing?: number;
  onClick?: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Graphics;
  private bgIsGraphics = false;
  private label: Phaser.GameObjects.Text;
  private iconSprite: Phaser.GameObjects.Image | null = null;
  private btnConfig: ButtonConfig;
  private isHovered = false;
  private isPressed = false;
  private _enabled = true;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    this.btnConfig = config;

    const bgColor = config.backgroundColor ?? 0x333333;
    const w = config.width ?? 180;
    const h = config.height ?? 48;
    const radius = config.borderRadius ?? 0;

    if (radius > 0) {
      // Rounded-rectangle background via Graphics
      this.bgIsGraphics = true;
      const g = scene.add.graphics();
      this.drawRoundedBg(g, w, h, radius, bgColor, config.borderColor, config.borderWidth);
      this.bg = g;
    } else {
      const rect = scene.add.rectangle(0, 0, w, h, bgColor).setOrigin(0.5);
      if (config.borderColor) {
        rect.setStrokeStyle(config.borderWidth ?? 1, config.borderColor);
      }
      this.bg = rect;
    }

    // Icon
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

    this.add([this.bg, this.label]);
    if (this.iconSprite) this.bringToTop(this.iconSprite);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      if (!this._enabled) return;
      this.isHovered = true;
      this.applyBgColor(config.hoverColor ?? 0x555555);
    });

    this.on('pointerout', () => {
      if (!this._enabled) return;
      this.isHovered = false;
      this.isPressed = false;
      this.applyBgColor(bgColor);
    });

    this.on('pointerdown', () => {
      if (!this._enabled) return;
      this.isPressed = true;
      this.applyBgColor(config.pressColor ?? 0x222222);
      // Press scale feedback
      this.setScale(0.96);
    });

    this.on('pointerup', () => {
      if (!this._enabled) return;
      this.setScale(1);
      if (this.isPressed) {
        this.isPressed = false;
        this.applyBgColor(this.isHovered ? (config.hoverColor ?? 0x555555) : bgColor);
        ConsoleReporter.input(`button clicked: ${config.text}`);
        config.onClick?.();
        this.emit('click');
      }
    });

    scene.add.existing(this);
  }

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
      this.applyBgColor(this.btnConfig.backgroundColor ?? 0x333333);
    } else {
      this.disableInteractive();
      this.setAlpha(0.5);
      this.applyBgColor(this.btnConfig.disabledColor ?? 0x222222);
    }
    return this;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setBackgroundColor(color: number): this {
    this.applyBgColor(color);
    return this;
  }

  // ── Internal helpers ──────────────────────────────────────

  private applyBgColor(color: number): void {
    if (this.bgIsGraphics) {
      const w = this.btnConfig.width ?? 180;
      const h = this.btnConfig.height ?? 48;
      const r = this.btnConfig.borderRadius ?? 0;
      this.drawRoundedBg(
        this.bg as Phaser.GameObjects.Graphics,
        w, h, r, color,
        this.btnConfig.borderColor, this.btnConfig.borderWidth,
      );
    } else {
      (this.bg as Phaser.GameObjects.Rectangle).setFillStyle(color);
    }
  }

  private drawRoundedBg(
    g: Phaser.GameObjects.Graphics,
    w: number, h: number, r: number,
    fill: number,
    stroke?: number, strokeWidth?: number,
  ): void {
    g.clear();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    if (stroke !== undefined) {
      g.lineStyle(strokeWidth ?? 1, stroke, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }
  }
}
