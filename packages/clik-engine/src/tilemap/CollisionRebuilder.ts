/**
 * Batched collision layer updates when tiles change.
 * Queues changed tile positions and rebuilds collision in bulk.
 *
 * Usage:
 * ```
 * const rebuilder = new CollisionRebuilder();
 * rebuilder.markDirty(5, 3);
 * rebuilder.markDirty(5, 4);
 * // At end of frame or after batch operations:
 * const dirtyTiles = rebuilder.flush();
 * for (const { x, y } of dirtyTiles) {
 *   tilemapLayer.setCollision(x, y, ...);
 * }
 * ```
 */

export interface DirtyTile {
  x: number;
  y: number;
}

export class CollisionRebuilder {
  private dirty: Map<string, DirtyTile> = new Map();
  private autoFlushCallback?: (tiles: DirtyTile[]) => void;

  /** Mark a tile position as needing collision rebuild */
  markDirty(tileX: number, tileY: number): void {
    const key = `${tileX},${tileY}`;
    this.dirty.set(key, { x: tileX, y: tileY });
  }

  /** Mark a rectangular region as dirty */
  markRegionDirty(x: number, y: number, width: number, height: number): void {
    for (let tx = x; tx < x + width; tx++) {
      for (let ty = y; ty < y + height; ty++) {
        this.markDirty(tx, ty);
      }
    }
  }

  /** Flush all dirty tiles and return them. Clears the dirty set. */
  flush(): DirtyTile[] {
    const tiles = Array.from(this.dirty.values());
    this.dirty.clear();
    return tiles;
  }

  /**
   * Set a callback that's invoked on flush with the dirty tiles.
   * Useful for automatic collision layer updates.
   */
  onFlush(callback: (tiles: DirtyTile[]) => void): this {
    this.autoFlushCallback = callback;
    return this;
  }

  /** Flush and invoke the auto-flush callback if set */
  flushAndRebuild(): void {
    const tiles = this.flush();
    if (tiles.length > 0 && this.autoFlushCallback) {
      this.autoFlushCallback(tiles);
    }
  }

  /** Check if any tiles are dirty */
  get hasDirty(): boolean {
    return this.dirty.size > 0;
  }

  /** Get count of dirty tiles */
  get dirtyCount(): number {
    return this.dirty.size;
  }

  /** Check if a specific tile is dirty */
  isDirty(tileX: number, tileY: number): boolean {
    return this.dirty.has(`${tileX},${tileY}`);
  }

  /** Clear all dirty tiles without processing */
  clear(): void {
    this.dirty.clear();
  }
}
