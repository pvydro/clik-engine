import type { GeneratedLevel, EntityPlacement } from '../PCGTypes';
import { TileType } from '../PCGTypes';

export interface LootTableEntry {
  type: string;
  /** Weight for random selection (higher = more common) */
  weight: number;
  /** Minimum difficulty to appear */
  minDifficulty?: number;
  /** Properties to attach to the entity */
  properties?: Record<string, unknown>;
}

export interface LootConfig {
  /** Available loot items */
  table?: LootTableEntry[];
  /** Base number of loot placements */
  baseCount?: number;
  /** Additional items per difficulty level */
  perDifficulty?: number;
  /** Prefer placing in dead-end tiles */
  preferDeadEnds?: boolean;
}

/**
 * Generates loot/item placements using weighted rarity tables.
 *
 * Usage:
 * ```
 * const loot = new LootGenerator({
 *   table: [
 *     { type: 'health_potion', weight: 10 },
 *     { type: 'speed_boost', weight: 5 },
 *     { type: 'rare_sword', weight: 1, minDifficulty: 5 },
 *   ],
 * });
 * const items = loot.generate(level, difficulty, seededRandom);
 * ```
 */
export class LootGenerator {
  private config: Required<LootConfig>;

  constructor(config?: LootConfig) {
    this.config = {
      table: config?.table ?? [{ type: 'item', weight: 1 }],
      baseCount: config?.baseCount ?? 3,
      perDifficulty: config?.perDifficulty ?? 0.5,
      preferDeadEnds: config?.preferDeadEnds ?? true,
    };
  }

  /** Generate loot placements for a level */
  generate(level: GeneratedLevel, difficulty = 5, random?: { nextFloat(min: number, max: number): number }): EntityPlacement[] {
    const placements: EntityPlacement[] = [];
    const count = Math.round(this.config.baseCount + difficulty * this.config.perDifficulty);

    // Find valid placement spots (floor tiles, not spawn/exit)
    const spots = this.findSpots(level);
    if (spots.length === 0) return placements;

    // Filter loot table by difficulty
    const available = this.config.table.filter(e => (e.minDifficulty ?? 0) <= difficulty);
    if (available.length === 0) return placements;

    for (let i = 0; i < count && i < spots.length; i++) {
      const spot = spots[i];
      const entry = this.weightedPick(available, random);
      if (entry) {
        placements.push({
          type: entry.type,
          x: spot.x,
          y: spot.y,
          properties: { ...entry.properties, loot: true },
        });
      }
    }

    return placements;
  }

  /** Get available items at a given difficulty */
  getAvailableItems(difficulty: number): LootTableEntry[] {
    return this.config.table.filter(e => (e.minDifficulty ?? 0) <= difficulty);
  }

  /** Get the loot table */
  getTable(): readonly LootTableEntry[] {
    return this.config.table;
  }

  private findSpots(level: GeneratedLevel): { x: number; y: number; isDeadEnd: boolean }[] {
    const grid = level.grid;
    const spots: { x: number; y: number; isDeadEnd: boolean }[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.get(x, y) !== TileType.FLOOR) continue;
        if (x === level.spawn.x && y === level.spawn.y) continue;
        if (x === level.exit.x && y === level.exit.y) continue;

        // Check if dead end (only one adjacent floor)
        let adjacentFloors = 0;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (grid.inBounds(nx, ny) && grid.get(nx, ny) === TileType.FLOOR) adjacentFloors++;
        }

        spots.push({ x, y, isDeadEnd: adjacentFloors <= 1 });
      }
    }

    // Sort: dead ends first if preferred
    if (this.config.preferDeadEnds) {
      spots.sort((a, b) => (b.isDeadEnd ? 1 : 0) - (a.isDeadEnd ? 1 : 0));
    }

    return spots;
  }

  private weightedPick(entries: LootTableEntry[], random?: { nextFloat(min: number, max: number): number }): LootTableEntry | null {
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight === 0) return null;

    const roll = random ? random.nextFloat(0, totalWeight) : Math.random() * totalWeight;
    let cumulative = 0;
    for (const entry of entries) {
      cumulative += entry.weight;
      if (roll <= cumulative) return entry;
    }
    return entries[entries.length - 1];
  }
}
