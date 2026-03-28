import Phaser from 'phaser';

/**
 * Letterbox/pillarbox bars for maintaining aspect ratio.
 * Creates black bars on the edges when the game doesn't fill the viewport.
 */
export class Letterbox {
  private scene: Phaser.Scene;
  private bars: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Add letterbox/pillarbox bars. Call after scene create.
   * The bars render on top of everything at high depth.
   */
  apply(color = 0x000000): void {
    this.remove();

    const { width, height } = this.scene.scale;
    const gameWidth = this.scene.game.config.width as number;
    const gameHeight = this.scene.game.config.height as number;
    const gameRatio = gameWidth / gameHeight;
    const screenRatio = width / height;

    if (Math.abs(gameRatio - screenRatio) < 0.01) return; // No bars needed

    if (screenRatio > gameRatio) {
      // Wider screen — pillarbox (vertical bars on sides)
      const barWidth = (width - height * gameRatio) / 2;
      this.bars.push(
        this.scene.add.rectangle(barWidth / 2, height / 2, barWidth, height, color)
          .setScrollFactor(0).setDepth(9990),
        this.scene.add.rectangle(width - barWidth / 2, height / 2, barWidth, height, color)
          .setScrollFactor(0).setDepth(9990),
      );
    } else {
      // Taller screen — letterbox (horizontal bars on top/bottom)
      const barHeight = (height - width / gameRatio) / 2;
      this.bars.push(
        this.scene.add.rectangle(width / 2, barHeight / 2, width, barHeight, color)
          .setScrollFactor(0).setDepth(9990),
        this.scene.add.rectangle(width / 2, height - barHeight / 2, width, barHeight, color)
          .setScrollFactor(0).setDepth(9990),
      );
    }
  }

  /** Remove all bars */
  remove(): void {
    for (const bar of this.bars) bar.destroy();
    this.bars = [];
  }

  /** Cinematic letterbox — animate bars sliding in from top/bottom */
  async cinematicIn(barHeight = 60, duration = 500, color = 0x000000): Promise<void> {
    this.remove();
    const { width, height } = this.scene.scale;

    const top = this.scene.add.rectangle(width / 2, -barHeight / 2, width, barHeight, color)
      .setScrollFactor(0).setDepth(9990);
    const bottom = this.scene.add.rectangle(width / 2, height + barHeight / 2, width, barHeight, color)
      .setScrollFactor(0).setDepth(9990);

    this.bars.push(top, bottom);

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: top,
        y: barHeight / 2,
        duration,
        ease: 'Cubic.easeOut',
      });
      this.scene.tweens.add({
        targets: bottom,
        y: height - barHeight / 2,
        duration,
        ease: 'Cubic.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  /** Animate bars sliding out */
  async cinematicOut(duration = 400): Promise<void> {
    if (this.bars.length === 0) return;
    const { height } = this.scene.scale;

    return new Promise(resolve => {
      for (let i = 0; i < this.bars.length; i++) {
        const bar = this.bars[i];
        const targetY = i === 0 ? -bar.height / 2 : height + bar.height / 2;
        this.scene.tweens.add({
          targets: bar,
          y: targetY,
          duration,
          ease: 'Cubic.easeIn',
          onComplete: i === this.bars.length - 1 ? () => { this.remove(); resolve(); } : undefined,
        });
      }
    });
  }
}
