import { BaseScene } from 'clik-engine';

export class GameScene extends BaseScene {
  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();

    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, '{{name}}', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#00ff88',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 50, 'Your game starts here!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
