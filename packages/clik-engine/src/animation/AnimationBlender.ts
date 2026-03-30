import Phaser from 'phaser';

/**
 * Crossfade between two animations on a sprite.
 * Uses alpha-based blending by overlaying a temporary sprite.
 */
export class AnimationBlender {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Crossfade from the current animation to a new one.
   * Creates a temporary clone sprite that fades out while the target fades in.
   */
  crossfade(
    sprite: Phaser.GameObjects.Sprite,
    toAnimKey: string,
    duration = 200,
  ): Promise<void> {
    return new Promise(resolve => {
      // Create a temporary snapshot at the current position
      const clone = this.scene.add.sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name);
      clone.setOrigin(sprite.originX, sprite.originY);
      clone.setScale(sprite.scaleX, sprite.scaleY);
      clone.setDepth(sprite.depth - 1);
      clone.setAlpha(1);

      // Start the new animation on the original sprite
      sprite.setAlpha(0);
      sprite.play(toAnimKey);

      // Crossfade: clone fades out, sprite fades in
      this.scene.tweens.add({
        targets: clone,
        alpha: 0,
        duration,
        onComplete: () => clone.destroy(),
      });

      this.scene.tweens.add({
        targets: sprite,
        alpha: 1,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Flash-cut to a new animation (instant switch, no blending).
   */
  cut(sprite: Phaser.GameObjects.Sprite, toAnimKey: string): void {
    sprite.play(toAnimKey);
  }
}
