import { BaseScene, Transitions, Button } from 'clik-engine';

export class TransitionTestScene extends BaseScene {
  constructor() {
    super({ key: 'transition-test' });
  }

  create(): void {
    super.create();

    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#1a0033');

    this.add.text(width / 2, 60, 'Transition Test Scene', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ff88ff',
    }).setOrigin(0.5);

    new Button(this, {
      x: width / 2, y: height / 2 - 60,
      text: 'Fade Back',
      backgroundColor: 0x660066,
      onClick: () => this.director.go('transition-test', 'sandbox', Transitions.fade(600)),
    });

    new Button(this, {
      x: width / 2, y: height / 2,
      text: 'Slide Left Back',
      backgroundColor: 0x660066,
      onClick: () => this.director.go('transition-test', 'sandbox', Transitions.slideLeft(500)),
    });

    new Button(this, {
      x: width / 2, y: height / 2 + 60,
      text: 'Zoom Back',
      backgroundColor: 0x660066,
      onClick: () => this.director.go('transition-test', 'sandbox', Transitions.zoom(700)),
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
