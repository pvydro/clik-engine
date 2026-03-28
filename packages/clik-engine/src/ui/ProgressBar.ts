import Phaser from 'phaser';

export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: number;
  fillColor?: number;
  value?: number;
}

export class ProgressBar extends Phaser.GameObjects.Container {
  private bgRect: Phaser.GameObjects.Rectangle;
  private fillRect: Phaser.GameObjects.Rectangle;
  private barWidth: number;
  private _value: number;

  constructor(scene: Phaser.Scene, config: ProgressBarConfig) {
    super(scene, config.x, config.y);

    this.barWidth = config.width;
    this._value = config.value ?? 0;

    this.bgRect = scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor ?? 0x222222)
      .setOrigin(0, 0.5);

    this.fillRect = scene.add.rectangle(0, 0, config.width * this._value, config.height, config.fillColor ?? 0x00ff88)
      .setOrigin(0, 0.5);

    this.add([this.bgRect, this.fillRect]);
    scene.add.existing(this);
  }

  get value(): number {
    return this._value;
  }

  setValue(value: number): this {
    this._value = Phaser.Math.Clamp(value, 0, 1);
    this.fillRect.setSize(this.barWidth * this._value, this.fillRect.height);
    return this;
  }

  setFillColor(color: number): this {
    this.fillRect.setFillStyle(color);
    return this;
  }
}
