export interface TileHealth {
  current: number;
  max: number;
  /** Current visual stage index */
  stage: number;
}

export interface DestructibleTileConfig {
  /** Max health for destructible tiles */
  maxHealth?: number;
  /** Visual stages as health decreases. Thresholds are health ratios (0-1). */
  stages?: { threshold: number; tileIndex: number }[];
  /** Tile index to replace with when destroyed (e.g., empty/rubble) */
  destroyedTileIndex?: number;
}

/**
 * Tracks health for destructible tiles and manages visual stage transitions.
 * Works with TilemapManager for tile replacement on damage/destruction.
 *
 * Usage:
 * ```
 * const destructible = new DestructibleTiles({ maxHealth: 100, destroyedTileIndex: 0 });
 * destructible.setStages([
 *   { threshold: 0.5, tileIndex: 42 }, // cracked
 *   { threshold: 0.25, tileIndex: 43 }, // heavily damaged
 * ]);
 * destructible.registerTile(5, 3); // tile at grid (5,3) is destructible
 * const result = destructible.damage(5, 3, 40);
 * // result.newTileIndex = stage tile or destroyed tile
 * ```
 */
export class DestructibleTiles {
  private config: Required<DestructibleTileConfig>;
  private tiles: Map<string, TileHealth> = new Map();
  private onDestroyCallback?: (tileX: number, tileY: number) => void;
  private onDamageCallback?: (tileX: number, tileY: number, remaining: number) => void;

  constructor(config?: DestructibleTileConfig) {
    this.config = {
      maxHealth: config?.maxHealth ?? 100,
      stages: config?.stages ?? [],
      destroyedTileIndex: config?.destroyedTileIndex ?? -1,
    };
  }

  /** Set visual damage stages */
  setStages(stages: { threshold: number; tileIndex: number }[]): this {
    this.config.stages = [...stages].sort((a, b) => b.threshold - a.threshold);
    return this;
  }

  /** Register a tile as destructible */
  registerTile(tileX: number, tileY: number, health?: number): this {
    const key = `${tileX},${tileY}`;
    this.tiles.set(key, {
      current: health ?? this.config.maxHealth,
      max: health ?? this.config.maxHealth,
      stage: 0,
    });
    return this;
  }

  /** Check if a tile is registered as destructible */
  isDestructible(tileX: number, tileY: number): boolean {
    return this.tiles.has(`${tileX},${tileY}`);
  }

  /**
   * Damage a tile. Returns the new tile index to display, or null if no change.
   * Returns -1 when destroyed (use destroyedTileIndex).
   */
  damage(tileX: number, tileY: number, amount: number): { destroyed: boolean; newTileIndex: number | null } {
    const key = `${tileX},${tileY}`;
    const tile = this.tiles.get(key);
    if (!tile) return { destroyed: false, newTileIndex: null };

    tile.current = Math.max(0, tile.current - amount);
    this.onDamageCallback?.(tileX, tileY, tile.current);

    if (tile.current <= 0) {
      this.tiles.delete(key);
      this.onDestroyCallback?.(tileX, tileY);
      return { destroyed: true, newTileIndex: this.config.destroyedTileIndex };
    }

    // Check stage transitions
    const ratio = tile.current / tile.max;
    let newTile: number | null = null;
    for (let i = 0; i < this.config.stages.length; i++) {
      if (ratio <= this.config.stages[i].threshold && tile.stage <= i) {
        tile.stage = i + 1;
        newTile = this.config.stages[i].tileIndex;
      }
    }

    return { destroyed: false, newTileIndex: newTile };
  }

  /** Repair a tile */
  repair(tileX: number, tileY: number, amount: number): void {
    const key = `${tileX},${tileY}`;
    const tile = this.tiles.get(key);
    if (!tile) return;
    tile.current = Math.min(tile.max, tile.current + amount);
  }

  /** Get tile health */
  getHealth(tileX: number, tileY: number): TileHealth | null {
    return this.tiles.get(`${tileX},${tileY}`) ?? null;
  }

  /** Register callback for tile destruction */
  onDestroy(callback: (tileX: number, tileY: number) => void): this {
    this.onDestroyCallback = callback;
    return this;
  }

  /** Register callback for tile damage */
  onDamage(callback: (tileX: number, tileY: number, remaining: number) => void): this {
    this.onDamageCallback = callback;
    return this;
  }

  /** Get count of tracked destructible tiles */
  get tileCount(): number {
    return this.tiles.size;
  }

  /** Clear all tracked tiles */
  clear(): void {
    this.tiles.clear();
  }
}
