import Phaser from 'phaser';

export interface LabelConfig {
  x: number;
  y: number;
  text: string;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  origin?: { x: number; y: number };
}

export class Label extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: LabelConfig) {
    super(scene, config.x, config.y);

    this.label = scene.add.text(0, 0, config.text, {
      fontSize: config.fontSize ?? '16px',
      fontFamily: config.fontFamily ?? 'monospace',
      color: config.color ?? '#ffffff',
      padding: config.padding ? { x: config.padding, y: config.padding } : undefined,
    }).setOrigin(0.5);

    if (config.backgroundColor) {
      const bounds = this.label.getBounds();
      this.bg = scene.add.rectangle(0, 0, bounds.width + 8, bounds.height + 4, Phaser.Display.Color.HexStringToColor(config.backgroundColor).color, 0.9)
        .setOrigin(0.5);
      this.add(this.bg);
    }

    this.add(this.label);

    const origin = config.origin ?? { x: 0.5, y: 0.5 };
    // Container doesn't have setOrigin, adjust position manually
    this.setPosition(config.x, config.y);

    scene.add.existing(this);
  }

  setText(text: string): this {
    this.label.setText(text);
    if (this.bg) {
      const bounds = this.label.getBounds();
      this.bg.setSize(bounds.width + 8, bounds.height + 4);
    }
    return this;
  }

  getText(): string {
    return this.label.text;
  }

  setColor(color: string): this {
    this.label.setColor(color);
    return this;
  }
}
