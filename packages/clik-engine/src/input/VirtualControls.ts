import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface VirtualControlsConfig {
  dpad?: boolean;
  buttons?: { key: string; label: string }[];
}

export class VirtualControls extends Phaser.Scene {
  private config: VirtualControlsConfig = {};
  private activeDirections: Set<string> = new Set();
  private activeButtons: Set<string> = new Set();
  private visible = true;

  constructor() {
    super({ key: '__clik_virtual_controls' });
  }

  init(data?: VirtualControlsConfig): void {
    if (data) this.config = data;
  }

  create(): void {
    if (!this.config.dpad && !this.config.buttons?.length) return;

    const { width, height } = this.scale;
    const isMobile = !this.sys.game.device.os.desktop;

    if (!isMobile) {
      this.visible = false;
      return;
    }

    if (this.config.dpad) {
      this.createDPad(100, height - 120);
    }

    if (this.config.buttons) {
      let btnX = width - 80;
      for (const btn of this.config.buttons) {
        this.createButton(btnX, height - 120, btn.key, btn.label);
        btnX -= 80;
      }
    }

    ConsoleReporter.input('Virtual controls created');
  }

  private createDPad(cx: number, cy: number): void {
    const size = 50;
    const gap = 4;
    const dirs = [
      { key: 'up', x: 0, y: -(size + gap) },
      { key: 'down', x: 0, y: size + gap },
      { key: 'left', x: -(size + gap), y: 0 },
      { key: 'right', x: size + gap, y: 0 },
    ];

    for (const dir of dirs) {
      const btn = this.add.rectangle(cx + dir.x, cy + dir.y, size, size, 0x444444, 0.6)
        .setInteractive()
        .on('pointerdown', () => {
          this.activeDirections.add(dir.key);
          btn.setFillStyle(0x00ff88, 0.8);
        })
        .on('pointerup', () => {
          this.activeDirections.delete(dir.key);
          btn.setFillStyle(0x444444, 0.6);
        })
        .on('pointerout', () => {
          this.activeDirections.delete(dir.key);
          btn.setFillStyle(0x444444, 0.6);
        });

      this.add.text(cx + dir.x, cy + dir.y, dir.key[0].toUpperCase(), {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      }).setOrigin(0.5);
    }
  }

  private createButton(x: number, y: number, key: string, label: string): void {
    const btn = this.add.circle(x, y, 30, 0x444444, 0.6)
      .setInteractive()
      .on('pointerdown', () => {
        this.activeButtons.add(key);
        btn.setFillStyle(0x00ff88, 0.8);
      })
      .on('pointerup', () => {
        this.activeButtons.delete(key);
        btn.setFillStyle(0x444444, 0.6);
      })
      .on('pointerout', () => {
        this.activeButtons.delete(key);
        btn.setFillStyle(0x444444, 0.6);
      });

    this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  isDirectionDown(dir: string): boolean {
    return this.activeDirections.has(dir);
  }

  isButtonDown(key: string): boolean {
    return this.activeButtons.has(key);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.scene.setVisible(this.visible);
  }
}
