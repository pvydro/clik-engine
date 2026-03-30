import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface SliderConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  value?: number;
  trackColor?: number;
  fillColor?: number;
  thumbColor?: number;
  onChange?: (value: number) => void;
}

export class Slider extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private thumb: Phaser.GameObjects.Arc;
  private sliderConfig: SliderConfig;
  private _value: number;
  private dragging = false;

  constructor(scene: Phaser.Scene, config: SliderConfig) {
    super(scene, config.x, config.y);
    this.sliderConfig = config;

    const w = config.width ?? 200;
    const h = config.height ?? 8;
    this._value = config.value ?? 0.5;
    const min = config.min ?? 0;
    const max = config.max ?? 1;
    const normalized = (this._value - min) / (max - min);

    this.track = scene.add.rectangle(0, 0, w, h, config.trackColor ?? 0x333333).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(0, 0, w * normalized, h, config.fillColor ?? 0x00ff88).setOrigin(0, 0.5);
    this.thumb = scene.add.circle(w * normalized, 0, h + 4, config.thumbColor ?? 0xffffff)
      .setInteractive({ draggable: true, useHandCursor: true });

    this.add([this.track, this.fill, this.thumb]);

    this.thumb.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clamped = Phaser.Math.Clamp(dragX, 0, w);
      this.thumb.x = clamped;
      this.fill.width = clamped;
      const norm = clamped / w;
      this._value = min + norm * (max - min);
      config.onChange?.(this._value);
      this.emit('change', this._value);
    });

    // Also allow clicking the track
    this.track.setInteractive();
    this.track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - this.x;
      const clamped = Phaser.Math.Clamp(localX, 0, w);
      this.thumb.x = clamped;
      this.fill.width = clamped;
      const norm = clamped / w;
      this._value = min + norm * (max - min);
      config.onChange?.(this._value);
      this.emit('change', this._value);
    });

    scene.add.existing(this);
  }

  get value(): number {
    return this._value;
  }

  setValue(value: number): this {
    const min = this.sliderConfig.min ?? 0;
    const max = this.sliderConfig.max ?? 1;
    const w = this.sliderConfig.width ?? 200;
    this._value = Phaser.Math.Clamp(value, min, max);
    const norm = (this._value - min) / (max - min);
    this.thumb.x = w * norm;
    this.fill.width = w * norm;
    return this;
  }
}
