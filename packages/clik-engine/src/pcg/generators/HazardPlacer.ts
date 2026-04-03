import type { GeneratedLevel, EntityPlacement } from '../PCGTypes';
import { TileType } from '../PCGTypes';

export interface HazardDef {
  type: string;
  /** Tile type to place (e.g., TileType.HAZARD) */
  tileType?: number;
  /** Min spacing between hazards of this type */
  minSpacing?: number;
  /** Properties to attach */
  properties?: Record<string, unknown>;
}

export interface HazardPlacerConfig {
  /** Available hazard types */
  hazards?: HazardDef[];
  /** Base hazard count */
  baseCount?: number;
  /** Additional hazards per difficulty level */
  perDifficulty?: number;
  /** Min distance from spawn (tiles) */
  minDistanceFromSpawn?: number;
}

/**
 * Places environmental hazards in generated levels.
 * Respects spacing rules to avoid unfair clusters.
 *
 * Usage:
 * ```
 * const placer = new HazardPlacer({
 *   hazards: [
 *     { type: 'spike_trap', minSpacing: 3 },
 *     { type: 'fire_pit', minSpacing: 5 },
 *   ],
 * });
 * const hazards = placer.place(level, difficulty);
 * ```
 */
export class HazardPlacer {
  private config: Required<HazardPlacerConfig>;

  constructor(config?: HazardPlacerConfig) {
    this.config = {
      hazards: config?.hazards ?? [{ type: 'hazard', minSpacing: 3 }],
      baseCount: config?.baseCount ?? 5,
      perDifficulty: config?.perDifficulty ?? 1,
      minDistanceFromSpawn: config?.minDistanceFromSpawn ?? 3,
    };
  }

  /** Place hazards in a level. Returns entity placements. */
  place(level: GeneratedLevel, difficulty = 5): EntityPlacement[] {
    const placements: EntityPlacement[] = [];
    const count = Math.round(this.config.baseCount + difficulty * this.config.perDifficulty);

    // Find valid floor tiles
    const grid = level.grid;
    const candidates: { x: number; y: number }[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.get(x, y) !== TileType.FLOOR) continue;
        const distFromSpawn = Math.abs(x - level.spawn.x) + Math.abs(y - level.spawn.y);
        if (distFromSpawn < this.config.minDistanceFromSpawn) continue;
        // Not on spawn or exit
        if (x === level.spawn.x && y === level.spawn.y) continue;
        if (x === level.exit.x && y === level.exit.y) continue;
        candidates.push({ x, y });
      }
    }

    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Place hazards with spacing
    const placed: { x: number; y: number; hazardIdx: number }[] = [];

    for (const candidate of candidates) {
      if (placements.length >= count) break;

      const hazardIdx = placements.length % this.config.hazards.length;
      const hazard = this.config.hazards[hazardIdx];
      const spacing = hazard.minSpacing ?? 3;

      // Check spacing against already-placed hazards of same type
      const tooClose = placed.some(p => {
        if (p.hazardIdx !== hazardIdx) return false;
        const dist = Math.abs(p.x - candidate.x) + Math.abs(p.y - candidate.y);
        return dist < spacing;
      });

      if (tooClose) continue;

      placements.push({
        type: hazard.type,
        x: candidate.x,
        y: candidate.y,
        properties: { ...hazard.properties, hazard: true },
      });
      placed.push({ ...candidate, hazardIdx });

      // Optionally mark the tile
      if (hazard.tileType !== undefined) {
        grid.set(candidate.x, candidate.y, hazard.tileType);
      }
    }

    return placements;
  }

  /** Get expected hazard count for a difficulty */
  getExpectedCount(difficulty: number): number {
    return Math.round(this.config.baseCount + difficulty * this.config.perDifficulty);
  }
}
