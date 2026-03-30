import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface ToggleConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: boolean;
  onColor?: number;
  offColor?: number;
  thumbColor?: number;
  label?: string;
  onChange?: (value: boolean) => void;
}

export class Toggle extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private thumb: Phaser.GameObjects.Arc;
  private labelText: Phaser.GameObjects.Text | null = null;
  private _value: boolean;
  private toggleConfig: ToggleConfig;

  constructor(scene: Phaser.Scene, config: ToggleConfig) {
    super(scene, config.x, config.y);
    this.toggleConfig = config;
    this._value = config.value ?? false;

    const w = config.width ?? 50;
    const h = config.height ?? 26;
    const r = h / 2 - 3;

    this.bg = scene.add.rectangle(0, 0, w, h, this._value ? (config.onColor ?? 0x00ff88) : (config.offColor ?? 0x444444))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.thumb = scene.add.circle(this._value ? w / 2 - r - 3 : -w / 2 + r + 3, 0, r, config.thumbColor ?? 0xffffff);

    this.add([this.bg, this.thumb]);

    if (config.label) {
      this.labelText = scene.add.text(w / 2 + 10, 0, config.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#cccccc',
      }).setOrigin(0, 0.5);
      this.add(this.labelText);
    }

    this.bg.on('pointerup', () => {
      this.toggle();
    });

    scene.add.existing(this);
  }

  toggle(): void {
    this._value = !this._value;
    const w = this.toggleConfig.width ?? 50;
    const h = this.toggleConfig.height ?? 26;
    const r = h / 2 - 3;

    this.bg.setFillStyle(this._value ? (this.toggleConfig.onColor ?? 0x00ff88) : (this.toggleConfig.offColor ?? 0x444444));
    this.thumb.x = this._value ? w / 2 - r - 3 : -w / 2 + r + 3;

    this.toggleConfig.onChange?.(this._value);
    this.emit('change', this._value);
    ConsoleReporter.input(`toggle: ${this.toggleConfig.label ?? 'unnamed'} = ${this._value}`);
  }

  get value(): boolean {
    return this._value;
  }

  setValue(value: boolean): this {
    if (this._value !== value) this.toggle();
    return this;
  }
}
