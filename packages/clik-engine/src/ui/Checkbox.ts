import Phaser from 'phaser';

export interface CheckboxConfig {
  x: number;
  y: number;
  label?: string;
  checked?: boolean;
  size?: number;
  boxColor?: number;
  checkColor?: number;
  labelColor?: string;
  fontSize?: string;
  onChange?: (checked: boolean) => void;
}

/**
 * Canvas-rendered checkbox with label.
 */
export class Checkbox extends Phaser.GameObjects.Container {
  private box: Phaser.GameObjects.Rectangle;
  private checkMark: Phaser.GameObjects.Text;
  private labelText: Phaser.GameObjects.Text | null = null;
  private _checked: boolean;
  private cbConfig: CheckboxConfig;

  constructor(scene: Phaser.Scene, config: CheckboxConfig) {
    super(scene, config.x, config.y);
    this.cbConfig = config;
    this._checked = config.checked ?? false;

    const size = config.size ?? 24;
    const boxColor = config.boxColor ?? 0x333333;

    this.box = scene.add.rectangle(0, 0, size, size, boxColor)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true });

    this.checkMark = scene.add.text(0, -1, '\u2713', {
      fontSize: `${size - 6}px`,
      fontFamily: 'monospace',
      color: config.checkColor ? `#${config.checkColor.toString(16).padStart(6, '0')}` : '#00ff88',
    }).setOrigin(0.5).setVisible(this._checked);

    this.add([this.box, this.checkMark]);

    if (config.label) {
      this.labelText = scene.add.text(size / 2 + 8, 0, config.label, {
        fontSize: config.fontSize ?? '14px',
        fontFamily: 'monospace',
        color: config.labelColor ?? '#ffffff',
      }).setOrigin(0, 0.5);
      this.add(this.labelText);
    }

    this.box.on('pointerup', () => this.toggle());

    scene.add.existing(this);
  }

  toggle(): void {
    this._checked = !this._checked;
    this.checkMark.setVisible(this._checked);
    this.box.setStrokeStyle(2, this._checked ? 0x00ff88 : 0x666666);
    this.cbConfig.onChange?.(this._checked);
    this.emit('change', this._checked);
  }

  get checked(): boolean {
    return this._checked;
  }

  setChecked(value: boolean): this {
    if (this._checked !== value) this.toggle();
    return this;
  }
}
