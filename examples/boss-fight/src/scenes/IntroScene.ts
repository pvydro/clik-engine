import {
  BaseScene, ConsoleReporter,
  OrbitalCamera,
} from 'clik-engine';
import Phaser from 'phaser';

export class IntroScene extends BaseScene {
  private orbital!: OrbitalCamera;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private bossGraphics!: Phaser.GameObjects.Graphics;
  private transitioned = false;

  constructor() {
    super({ key: 'intro' });
  }

  create(): void {
    super.create();
    this.transitioned = false;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0008');

    if (this.physics?.world) {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
    }

    const cx = width / 2;
    const cy = height / 2;

    // Arena floor ring
    const arenaGfx = this.add.graphics();
    arenaGfx.lineStyle(2, 0x331133);
    arenaGfx.strokeCircle(cx, cy, 300);
    arenaGfx.lineStyle(1, 0x220022);
    arenaGfx.strokeCircle(cx, cy, 200);

    // Boss visual — large purple rectangle with inner eye
    this.bossGraphics = this.add.graphics();
    this.bossGraphics.fillStyle(0x6633aa);
    this.bossGraphics.fillRect(cx - 32, cy - 32, 64, 64);
    this.bossGraphics.lineStyle(2, 0x9966dd);
    this.bossGraphics.strokeRect(cx - 32, cy - 32, 64, 64);
    // Eye
    this.bossGraphics.fillStyle(0xff4444);
    this.bossGraphics.fillCircle(cx, cy, 8);
    this.bossGraphics.setDepth(5);

    // Title text
    this.titleText = this.add.text(cx, cy - 120, 'THE SENTINEL', {
      fontSize: '48px', fontFamily: 'monospace', color: '#9966dd',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.subtitleText = this.add.text(cx, cy + 120, 'PREPARE FOR BATTLE', {
      fontSize: '16px', fontFamily: 'monospace', color: '#664488',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // Orbital camera
    this.orbital = new OrbitalCamera(this, {
      centerX: cx, centerY: cy, radius: 150, angularSpeed: 0.8,
    });
    this.orbital.start();

    // Fade in title after 1s
    this.time.delayedCall(1000, () => {
      this.tweens.add({ targets: this.titleText, alpha: 1, duration: 800, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.subtitleText, alpha: 1, duration: 800, delay: 400, ease: 'Sine.easeIn' });
    });

    // Transition to game after 4s
    this.time.delayedCall(4000, () => {
      if (!this.transitioned) {
        this.transitioned = true;
        this.orbital.stop();
        this.scene.start('game');
      }
    });

    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.1);

    ConsoleReporter.scene('Boss intro — orbital camera');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.orbital.update(delta);
  }
}
