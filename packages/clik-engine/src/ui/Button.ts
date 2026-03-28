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
  backgroundColor?: number;
  hoverColor?: number;
  pressColor?: number;
  borderRadius?: number;
  onClick?: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private config: ButtonConfig;
  private isHovered = false;
  private isPressed = false;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    this.config = config;

    const bgColor = config.backgroundColor ?? 0x333333;
    const w = config.width ?? 180;
    const h = config.height ?? 48;

    this.bg = scene.add.rectangle(0, 0, w, h, bgColor)
      .setOrigin(0.5);

    this.label = scene.add.text(0, 0, config.text, {
      fontSize: config.fontSize ?? '18px',
      fontFamily: config.fontFamily ?? 'monospace',
      color: config.color ?? '#ffffff',
    }).setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      this.isHovered = true;
      this.bg.setFillStyle(config.hoverColor ?? 0x555555);
    });

    this.on('pointerout', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.bg.setFillStyle(bgColor);
    });

    this.on('pointerdown', () => {
      this.isPressed = true;
      this.bg.setFillStyle(config.pressColor ?? 0x222222);
    });

    this.on('pointerup', () => {
      if (this.isPressed) {
        this.isPressed = false;
        this.bg.setFillStyle(this.isHovered ? (config.hoverColor ?? 0x555555) : bgColor);
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

  setEnabled(enabled: boolean): this {
    this.setInteractive(enabled ? { useHandCursor: true } : false);
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }
}
