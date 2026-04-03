import Phaser from 'phaser';
import { Component } from '../Component';

/**
 * Flashes the entity white (or custom color) when triggered.
 * Useful for damage feedback.
 */
export class FlashOnHit extends Component {
  private flashDuration: number;
  private flashColor: number;
  private flashing = false;

  constructor(durationMs = 100, color = 0xffffff) {
    super();
    this.flashDuration = durationMs;
    this.flashColor = color;
  }

  flash(): void {
    if (this.flashing) return;
    this.flashing = true;

    // Find sprite children and tint them
    const sprites = this.findSprites();
    for (const sprite of sprites) {
      sprite.setTintFill(this.flashColor);
    }

    this.entity.scene.time.delayedCall(this.flashDuration, () => {
      for (const sprite of sprites) {
        sprite.clearTint();
      }
      this.flashing = false;
    });
  }

  private findSprites(): Phaser.GameObjects.Sprite[] {
    const results: Phaser.GameObjects.Sprite[] = [];
    const children = (this.entity as Phaser.GameObjects.Container).list ?? [];
    for (const child of children) {
      if (child instanceof Phaser.GameObjects.Sprite) {
        results.push(child);
      }
    }
    // Also check if entity itself has tint (rectangle, etc.)
    if ('setTintFill' in this.entity) {
      results.push(this.entity as unknown as Phaser.GameObjects.Sprite);
    }
    return results;
  }

  isFlashing(): boolean {
    return this.flashing;
  }

  reset(): void {
    this.flashing = false;
  }
}
