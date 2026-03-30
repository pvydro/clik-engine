import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface DialogConfig {
  width?: number;
  height?: number;
  title?: string;
  message?: string;
  backgroundColor?: number;
  backdropAlpha?: number;
}

export class Dialog extends Phaser.GameObjects.Container {
  private backdrop: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private dialogScene: Phaser.Scene;

  constructor(scene: Phaser.Scene, config: DialogConfig = {}) {
    const { width: sw, height: sh } = scene.scale;
    super(scene, sw / 2, sh / 2);
    this.dialogScene = scene;

    const w = config.width ?? 400;
    const h = config.height ?? 250;

    this.backdrop = scene.add.rectangle(0, 0, sw * 2, sh * 2, 0x000000, config.backdropAlpha ?? 0.6)
      .setOrigin(0.5)
      .setInteractive();

    this.panel = scene.add.rectangle(0, 0, w, h, config.backgroundColor ?? 0x1a1a1a)
      .setOrigin(0.5);

    this.add([this.backdrop, this.panel]);

    if (config.title) {
      this.titleText = scene.add.text(0, -h / 2 + 24, config.title, {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.add(this.titleText);
    }

    if (config.message) {
      this.messageText = scene.add.text(0, -20, config.message, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#cccccc',
        wordWrap: { width: w - 40 },
        align: 'center',
      }).setOrigin(0.5);
      this.add(this.messageText);
    }

    this.setDepth(9000);
    scene.add.existing(this);

    ConsoleReporter.scene(`Dialog opened: ${config.title ?? 'untitled'}`);
  }

  addButton(text: string, onClick: () => void, offsetX = 0, offsetY = 60): this {
    const btn = this.dialogScene.add.text(offsetX, offsetY, text, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ff88',
      backgroundColor: '#333333',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        ConsoleReporter.input(`dialog button: ${text}`);
        onClick();
        this.emit('button', text);
      })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#00ff88'); });

    this.add(btn);
    return this;
  }

  close(): void {
    ConsoleReporter.scene('Dialog closed');
    this.emit('close');
    this.destroy();
  }
}
