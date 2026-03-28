import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface NumberInputConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  onChange?: (value: number) => void;
}

/**
 * Number input with +/- buttons and display.
 * Useful for quantity selectors, settings, level pickers.
 */
export class NumberInput extends Phaser.GameObjects.Container {
  private _value: number;
  private numConfig: NumberInputConfig;
  private display: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: NumberInputConfig) {
    super(scene, config.x, config.y);
    this.numConfig = config;
    this._value = config.value ?? 0;

    const w = config.width ?? 140;
    const h = config.height ?? 36;
    const btnW = h;
    const step = config.step ?? 1;

    // Background
    const bg = scene.add.rectangle(0, 0, w, h, 0x222233).setOrigin(0.5);
    this.add(bg);

    // Minus button
    const minusBtn = scene.add.rectangle(-w / 2 + btnW / 2, 0, btnW, h, 0x333355)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const minusText = scene.add.text(-w / 2 + btnW / 2, 0, '-', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    this.add([minusBtn, minusText]);

    minusBtn.on('pointerup', () => this.setValue(this._value - step));
    minusBtn.on('pointerover', () => minusBtn.setFillStyle(0x444466));
    minusBtn.on('pointerout', () => minusBtn.setFillStyle(0x333355));

    // Plus button
    const plusBtn = scene.add.rectangle(w / 2 - btnW / 2, 0, btnW, h, 0x333355)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const plusText = scene.add.text(w / 2 - btnW / 2, 0, '+', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    this.add([plusBtn, plusText]);

    plusBtn.on('pointerup', () => this.setValue(this._value + step));
    plusBtn.on('pointerover', () => plusBtn.setFillStyle(0x444466));
    plusBtn.on('pointerout', () => plusBtn.setFillStyle(0x333355));

    // Display
    this.display = scene.add.text(0, 0, String(this._value), {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.display);

    // Label
    if (config.label) {
      const label = scene.add.text(0, -h / 2 - 12, config.label, {
        fontSize: '11px', fontFamily: 'monospace', color: '#888888',
      }).setOrigin(0.5);
      this.add(label);
    }

    scene.add.existing(this);
  }

  get value(): number {
    return this._value;
  }

  setValue(value: number): this {
    const min = this.numConfig.min ?? -Infinity;
    const max = this.numConfig.max ?? Infinity;
    this._value = Math.round(Phaser.Math.Clamp(value, min, max) * 100) / 100;
    this.display.setText(String(this._value));
    this.numConfig.onChange?.(this._value);
    return this;
  }

  increment(): this {
    return this.setValue(this._value + (this.numConfig.step ?? 1));
  }

  decrement(): this {
    return this.setValue(this._value - (this.numConfig.step ?? 1));
  }
}
