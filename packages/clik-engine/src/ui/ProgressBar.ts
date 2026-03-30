import Phaser from 'phaser';

export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: number;
  fillColor?: number;
  value?: number;
  label?: string;
  labelColor?: string;
  labelFontSize?: string;
  showPercentage?: boolean;
  borderColor?: number;
  borderWidth?: number;
  segments?: number; // 0 = smooth, >0 = segmented
  animateOnChange?: boolean;
  animateDuration?: number;
  /** Color thresholds: [{ below: 0.3, color: 0xff0000 }, { below: 0.6, color: 0xffff00 }] */
  thresholds?: { below: number; color: number }[];
}

export class ProgressBar extends Phaser.GameObjects.Container {
  private bgRect: Phaser.GameObjects.Rectangle;
  private fillRect: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text | null = null;
  private percentText: Phaser.GameObjects.Text | null = null;
  private barWidth: number;
  private barHeight: number;
  private _value: number;
  private barConfig: ProgressBarConfig;
  private activeTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: ProgressBarConfig) {
    super(scene, config.x, config.y);
    this.barConfig = config;
    this.barWidth = config.width;
    this.barHeight = config.height;
    this._value = config.value ?? 0;

    this.bgRect = scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor ?? 0x222222)
      .setOrigin(0, 0.5);

    if (config.borderColor) {
      this.bgRect.setStrokeStyle(config.borderWidth ?? 1, config.borderColor);
    }

    const fillColor = this.getColorForValue(this._value, config.fillColor ?? 0x00ff88);
    this.fillRect = scene.add.rectangle(0, 0, config.width * this._value, config.height, fillColor)
      .setOrigin(0, 0.5);

    this.add([this.bgRect, this.fillRect]);

    // Label (left of bar)
    if (config.label) {
      this.labelText = scene.add.text(-8, 0, config.label, {
        fontSize: config.labelFontSize ?? '11px',
        fontFamily: 'monospace',
        color: config.labelColor ?? '#aaaaaa',
      }).setOrigin(1, 0.5);
      this.add(this.labelText);
    }

    // Percentage text (inside or right of bar)
    if (config.showPercentage) {
      this.percentText = scene.add.text(config.width / 2, 0, `${Math.round(this._value * 100)}%`, {
        fontSize: config.labelFontSize ?? '10px',
        fontFamily: 'monospace',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.add(this.percentText);
    }

    // Segment lines
    if (config.segments && config.segments > 1) {
      const segWidth = config.width / config.segments;
      for (let i = 1; i < config.segments; i++) {
        const line = scene.add.rectangle(segWidth * i, 0, 1, config.height, config.backgroundColor ?? 0x222222)
          .setOrigin(0.5);
        this.add(line);
      }
    }

    scene.add.existing(this);
  }

  get value(): number {
    return this._value;
  }

  setValue(value: number, animate?: boolean): this {
    const newValue = Phaser.Math.Clamp(value, 0, 1);
    const shouldAnimate = animate ?? this.barConfig.animateOnChange ?? false;

    if (shouldAnimate && this.scene) {
      if (this.activeTween) {
        this.activeTween.stop();
        this.activeTween = null;
      }
      this.activeTween = this.scene.tweens.add({
        targets: this,
        _value: newValue,
        duration: this.barConfig.animateDuration ?? 200,
        onUpdate: () => {
          this.fillRect.setSize(this.barWidth * this._value, this.barHeight);
          this.updateColor();
          this.updatePercentage();
        },
        onComplete: () => {
          this.activeTween = null;
        },
      });
    } else {
      this._value = newValue;
      this.fillRect.setSize(this.barWidth * this._value, this.barHeight);
      this.updateColor();
      this.updatePercentage();
    }

    return this;
  }

  setFillColor(color: number): this {
    this.fillRect.setFillStyle(color);
    return this;
  }

  setLabel(text: string): this {
    this.labelText?.setText(text);
    return this;
  }

  private updateColor(): void {
    const color = this.getColorForValue(this._value, this.barConfig.fillColor ?? 0x00ff88);
    this.fillRect.setFillStyle(color);
  }

  private updatePercentage(): void {
    this.percentText?.setText(`${Math.round(this._value * 100)}%`);
  }

  private getColorForValue(value: number, defaultColor: number): number {
    if (!this.barConfig.thresholds) return defaultColor;
    // Sort thresholds ascending
    const sorted = [...this.barConfig.thresholds].sort((a, b) => a.below - b.below);
    for (const t of sorted) {
      if (value < t.below) return t.color;
    }
    return defaultColor;
  }
}
