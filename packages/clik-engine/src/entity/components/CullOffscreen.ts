import { Component } from '../Component';
import type { EntityPool } from '../EntityPool';

/**
 * Automatically despawns entity when it moves outside the camera bounds.
 * If a pool is set, returns to pool instead of destroying.
 */
export class CullOffscreen extends Component {
  private margin: number;
  private pool: EntityPool | null = null;

  constructor(margin = 50) {
    super();
    this.margin = margin;
  }

  /** Set pool to return entity to when culled (instead of destroying) */
  usePool(pool: EntityPool): this {
    this.pool = pool;
    return this;
  }

  setMargin(margin: number): this {
    this.margin = margin;
    return this;
  }

  update(_delta: number): void {
    const cam = this.entity.scene.cameras.main;
    const x = this.entity.x;
    const y = this.entity.y;
    const left = cam.scrollX - this.margin;
    const right = cam.scrollX + cam.width + this.margin;
    const top = cam.scrollY - this.margin;
    const bottom = cam.scrollY + cam.height + this.margin;

    if (x < left || x > right || y < top || y > bottom) {
      if (this.pool) {
        this.pool.release(this.entity);
      } else {
        this.entity.destroy();
      }
    }
  }

  reset(): void {
    // Pool reference is kept — it's a structural binding, not per-life state
  }
}
