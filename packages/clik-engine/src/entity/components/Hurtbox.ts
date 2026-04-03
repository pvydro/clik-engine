import { Component } from '../Component';
import type { HurtboxDef, WorldBox } from '../combat/DamageTypes';

/**
 * Defines vulnerable collision volumes on an entity.
 * Supports invincibility frames (iframes) to prevent damage stacking.
 */
export class Hurtbox extends Component {
  private boxes: HurtboxDef[];
  private disabledTags: Set<string> = new Set();
  private iframeRemaining = 0;

  constructor(boxes: HurtboxDef[]) {
    super();
    this.boxes = boxes;
  }

  /** Get all active hurtboxes in world-space coordinates */
  getWorldBoxes(): WorldBox[] {
    const results: WorldBox[] = [];
    for (const box of this.boxes) {
      if (box.tag && this.disabledTags.has(box.tag)) continue;
      results.push({
        x: this.entity.x + box.offsetX,
        y: this.entity.y + box.offsetY,
        width: box.width,
        height: box.height,
        tag: box.tag,
      });
    }
    return results;
  }

  /** Get the raw hurtbox definitions */
  getBoxes(): readonly HurtboxDef[] {
    return this.boxes;
  }

  /** Start invincibility frames */
  triggerIframes(durationMs: number): void {
    this.iframeRemaining = durationMs;
  }

  /** Whether the entity is currently invincible */
  get isInvincible(): boolean {
    return this.iframeRemaining > 0;
  }

  /** Remaining iframe time in ms */
  get iframeTime(): number {
    return Math.max(0, this.iframeRemaining);
  }

  /** Disable a hurtbox by tag */
  disableByTag(tag: string): void {
    this.disabledTags.add(tag);
  }

  /** Enable a hurtbox by tag */
  enableByTag(tag: string): void {
    this.disabledTags.delete(tag);
  }

  update(delta: number): void {
    if (this.iframeRemaining > 0) {
      this.iframeRemaining -= delta;
    }
  }

  reset(): void {
    this.iframeRemaining = 0;
    this.disabledTags.clear();
  }
}
