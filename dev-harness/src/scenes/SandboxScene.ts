import { BaseScene, ConsoleReporter, Button, Transitions } from 'clik-engine';
import Phaser from 'phaser';

export class SandboxScene extends BaseScene {
  private title!: Phaser.GameObjects.Text;
  private frameCount = 0;

  constructor() {
    super({ key: 'sandbox' });
  }

  create(): void {
    super.create();

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#000000');

    this.title = this.add.text(width / 2, 80, 'clik-engine', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#00ff88',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, 'dev harness running', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(width / 2, 160, 'v0.4.0 | sandbox scene', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#555555',
    }).setOrigin(0.5);

    // Transition test buttons
    new Button(this, {
      x: width / 2, y: height / 2 + 20,
      text: 'Fade Transition',
      onClick: () => this.director.go('sandbox', 'transition-test', Transitions.fade(600)),
    });

    new Button(this, {
      x: width / 2, y: height / 2 + 80,
      text: 'Slide Left',
      onClick: () => this.director.go('sandbox', 'transition-test', Transitions.slideLeft(500)),
    });

    new Button(this, {
      x: width / 2, y: height / 2 + 140,
      text: 'Zoom Transition',
      onClick: () => this.director.go('sandbox', 'transition-test', Transitions.zoom(700)),
    });

    new Button(this, {
      x: width / 2, y: height / 2 + 200,
      text: 'Kitchen Sink',
      onClick: () => this.director.go('sandbox', 'kitchen-sink'),
    });

    this.inspectState('sandbox', () => ({
      frames: this.frameCount,
    }));

    ConsoleReporter.scene('SandboxScene ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.frameCount++;
  }
}
