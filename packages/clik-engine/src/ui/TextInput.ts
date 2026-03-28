import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface TextInputConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  placeholder?: string;
  value?: string;
  maxLength?: number;
  fontSize?: string;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: number;
  borderColor?: number;
  focusBorderColor?: number;
  placeholderColor?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export class TextInput extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private textDisplay: Phaser.GameObjects.Text;
  private cursor: Phaser.GameObjects.Rectangle;
  private inputConfig: TextInputConfig;
  private _value: string;
  private focused = false;
  private cursorVisible = true;
  private cursorTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config: TextInputConfig) {
    super(scene, config.x, config.y);
    this.inputConfig = config;
    this._value = config.value ?? '';

    const w = config.width ?? 200;
    const h = config.height ?? 36;

    this.bg = scene.add.rectangle(0, 0, w, h, config.backgroundColor ?? 0x222222)
      .setOrigin(0.5)
      .setStrokeStyle(2, config.borderColor ?? 0x444444)
      .setInteractive({ useHandCursor: true });

    this.textDisplay = scene.add.text(-w / 2 + 8, 0, this._value || config.placeholder || '', {
      fontSize: config.fontSize ?? '14px',
      fontFamily: config.fontFamily ?? 'monospace',
      color: this._value ? (config.textColor ?? '#ffffff') : (config.placeholderColor ?? '#666666'),
    }).setOrigin(0, 0.5);

    this.cursor = scene.add.rectangle(-w / 2 + 8, 0, 2, parseInt(config.fontSize ?? '14') + 4, 0xffffff)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.add([this.bg, this.textDisplay, this.cursor]);
    this.setSize(w, h);

    // Click to focus
    this.bg.on('pointerdown', () => this.focus());

    // Click outside to blur
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.focused) {
        const bounds = this.bg.getBounds();
        if (!bounds.contains(pointer.x, pointer.y)) {
          this.blur();
        }
      }
    });

    // Keyboard input
    if (scene.input.keyboard) {
      scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (!this.focused) return;

        if (event.key === 'Backspace') {
          this._value = this._value.slice(0, -1);
          this.updateDisplay();
          this.inputConfig.onChange?.(this._value);
        } else if (event.key === 'Enter') {
          this.inputConfig.onSubmit?.(this._value);
          ConsoleReporter.input(`text submitted: ${this._value}`);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          if (this.inputConfig.maxLength && this._value.length >= this.inputConfig.maxLength) return;
          this._value += event.key;
          this.updateDisplay();
          this.inputConfig.onChange?.(this._value);
        }
      });
    }

    scene.add.existing(this);
  }

  focus(): void {
    if (this.focused) return;
    this.focused = true;
    this.bg.setStrokeStyle(2, this.inputConfig.focusBorderColor ?? 0x00ff88);
    this.cursor.setVisible(true);
    this.updateCursorPosition();

    // Blink cursor
    this.cursorTimer = this.scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.cursor.setVisible(this.cursorVisible);
      },
    });
  }

  blur(): void {
    if (!this.focused) return;
    this.focused = false;
    this.bg.setStrokeStyle(2, this.inputConfig.borderColor ?? 0x444444);
    this.cursor.setVisible(false);
    this.cursorTimer?.destroy();
    this.cursorTimer = null;
  }

  get value(): string {
    return this._value;
  }

  setValue(value: string): this {
    this._value = value;
    this.updateDisplay();
    return this;
  }

  clear(): this {
    this._value = '';
    this.updateDisplay();
    return this;
  }

  isFocused(): boolean {
    return this.focused;
  }

  private updateDisplay(): void {
    const cfg = this.inputConfig;
    if (this._value) {
      this.textDisplay.setText(this._value);
      this.textDisplay.setColor(cfg.textColor ?? '#ffffff');
    } else {
      this.textDisplay.setText(cfg.placeholder ?? '');
      this.textDisplay.setColor(cfg.placeholderColor ?? '#666666');
    }
    this.updateCursorPosition();
  }

  private updateCursorPosition(): void {
    const w = this.inputConfig.width ?? 200;
    const textWidth = this.textDisplay.width;
    this.cursor.x = -w / 2 + 8 + textWidth + 2;
  }

  destroy(fromScene?: boolean): void {
    this.cursorTimer?.destroy();
    super.destroy(fromScene);
  }
}
