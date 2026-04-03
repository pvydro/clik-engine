import { Component } from '../Component';
import type { HitboxDef, WorldBox } from '../combat/DamageTypes';

/**
 * Defines attack/damage collision volumes on an entity.
 * Supports multiple hitboxes per entity, each with optional damage type and amount.
 */
export class Hitbox extends Component {
  private boxes: HitboxDef[];
  private disabledTags: Set<string> = new Set();

  constructor(boxes: HitboxDef[]) {
    super();
    this.boxes = boxes;
  }

  /** Get all active hitboxes in world-space coordinates */
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

  /** Get the raw hitbox definitions */
  getBoxes(): readonly HitboxDef[] {
    return this.boxes;
  }

  /** Disable a hitbox by tag */
  disableByTag(tag: string): void {
    this.disabledTags.add(tag);
  }

  /** Enable a hitbox by tag */
  enableByTag(tag: string): void {
    this.disabledTags.delete(tag);
  }

  /** Check if a tagged hitbox is enabled */
  isTagEnabled(tag: string): boolean {
    return !this.disabledTags.has(tag);
  }

  reset(): void {
    this.disabledTags.clear();
  }
}
