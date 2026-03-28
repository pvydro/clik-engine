import Phaser from 'phaser';

/**
 * Simplified sprite animator that handles animation direction (flipX)
 * and provides a clean API for common animation patterns.
 */
export class SpriteAnimator {
  private sprite: Phaser.GameObjects.Sprite;
  private currentKey: string | null = null;

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite;
  }

  /** Play animation, optionally flipping sprite based on direction */
  play(key: string, ignoreIfPlaying = true): this {
    if (ignoreIfPlaying && this.currentKey === key && this.sprite.anims.isPlaying) {
      return this;
    }
    this.sprite.play(key, ignoreIfPlaying);
    this.currentKey = key;
    return this;
  }

  /** Play and wait for completion (for non-looping animations) */
  async playOnce(key: string): Promise<void> {
    this.sprite.play(key);
    this.currentKey = key;

    return new Promise(resolve => {
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => resolve());
    });
  }

  /** Set facing direction (flips sprite horizontally) */
  face(direction: 'left' | 'right'): this {
    this.sprite.setFlipX(direction === 'left');
    return this;
  }

  /** Face toward a point */
  faceToward(targetX: number): this {
    this.sprite.setFlipX(targetX < this.sprite.x);
    return this;
  }

  /** Stop the current animation */
  stop(): this {
    this.sprite.stop();
    this.currentKey = null;
    return this;
  }

  /** Check if a specific animation is currently playing */
  isPlaying(key?: string): boolean {
    if (!this.sprite.anims.isPlaying) return false;
    if (key) return this.currentKey === key;
    return true;
  }

  /** Get current animation key */
  getCurrentKey(): string | null {
    return this.currentKey;
  }

  /** Set animation speed multiplier */
  setTimeScale(scale: number): this {
    this.sprite.anims.timeScale = scale;
    return this;
  }

  /** Chain: play key1, then when it completes, play key2 */
  async chain(key1: string, key2: string): Promise<void> {
    await this.playOnce(key1);
    this.play(key2);
  }
}
