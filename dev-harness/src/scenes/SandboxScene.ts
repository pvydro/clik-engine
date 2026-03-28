import { BaseScene, ConsoleReporter } from 'clik-engine';
import Phaser from 'phaser';

export class SandboxScene extends BaseScene {
  private title!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private frameCount = 0;

  constructor() {
    super({ key: 'sandbox' });
  }

  create(): void {
    super.create();

    const { width, height } = this.scale;

    this.title = this.add.text(width / 2, height / 2 - 40, 'clik-engine', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#00ff88',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.info = this.add.text(width / 2, height / 2 + 30, 'dev harness running', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    const versionText = this.add.text(width / 2, height / 2 + 70, 'v0.1.0 | sandbox scene', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#555555',
    }).setOrigin(0.5);

    ConsoleReporter.scene('SandboxScene ready');
    ConsoleReporter.state('sandbox.status', 'running');
  }

  update(time: number, delta: number): void {
    this.frameCount++;
    if (this.frameCount % 300 === 0) {
      ConsoleReporter.state('sandbox.frames', this.frameCount);
    }
  }
}
