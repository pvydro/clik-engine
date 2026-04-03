import type { GeneratedLevel, EntityPlacement } from '../PCGTypes';
import { TileType } from '../PCGTypes';

export interface EncounterConfig {
  /** Enemy prefab types available */
  enemyTypes?: string[];
  /** Base enemy count per room/area */
  baseEnemyCount?: number;
  /** Difficulty multiplier for enemy count */
  difficultyScale?: number;
  /** Min distance from spawn point (in tiles) */
  minDistanceFromSpawn?: number;
  /** Whether to place a boss in the farthest room */
  placeBoss?: boolean;
  /** Boss prefab type */
  bossType?: string;
}

/**
 * Places encounters (enemy groups) and bosses in generated levels.
 * Analyzes level topology to place harder encounters farther from spawn.
 *
 * Usage:
 * ```
 * const placer = new EncounterPlacer({
 *   enemyTypes: ['goblin', 'skeleton', 'archer'],
 *   placeBoss: true, bossType: 'dragon',
 * });
 * const entities = placer.place(level, difficulty);
 * ```
 */
export class EncounterPlacer {
  private config: Required<EncounterConfig>;

  constructor(config?: EncounterConfig) {
    this.config = {
      enemyTypes: config?.enemyTypes ?? ['enemy'],
      baseEnemyCount: config?.baseEnemyCount ?? 3,
      difficultyScale: config?.difficultyScale ?? 0.5,
      minDistanceFromSpawn: config?.minDistanceFromSpawn ?? 5,
      placeBoss: config?.placeBoss ?? false,
      bossType: config?.bossType ?? 'boss',
    };
  }

  /** Place encounters in a generated level. Returns new entity placements. */
  place(level: GeneratedLevel, difficulty = 5): EntityPlacement[] {
    const placements: EntityPlacement[] = [];
    const grid = level.grid;
    const spawn = level.spawn;

    // Find all floor tiles far enough from spawn
    const candidates: { x: number; y: number; dist: number }[] = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.get(x, y) !== TileType.FLOOR) continue;
        const dist = Math.abs(x - spawn.x) + Math.abs(y - spawn.y);
        if (dist >= this.config.minDistanceFromSpawn) {
          candidates.push({ x, y, dist });
        }
      }
    }

    if (candidates.length === 0) return placements;

    // Sort by distance (farthest first for harder encounters)
    candidates.sort((a, b) => b.dist - a.dist);

    // Place boss at farthest point
    if (this.config.placeBoss && candidates.length > 0) {
      const bossSpot = candidates[0];
      placements.push({
        type: this.config.bossType,
        x: bossSpot.x,
        y: bossSpot.y,
        properties: { isBoss: true, difficulty },
      });
    }

    // Place regular enemies
    const enemyCount = Math.round(this.config.baseEnemyCount + difficulty * this.config.difficultyScale);
    const spacing = Math.max(1, Math.floor(candidates.length / enemyCount));

    for (let i = 0; i < enemyCount && i * spacing < candidates.length; i++) {
      const spot = candidates[i * spacing];
      // Scale enemy type by distance (harder enemies farther)
      const typeIndex = Math.min(
        this.config.enemyTypes.length - 1,
        Math.floor((spot.dist / (candidates[0]?.dist || 1)) * this.config.enemyTypes.length),
      );
      placements.push({
        type: this.config.enemyTypes[typeIndex],
        x: spot.x,
        y: spot.y,
        properties: { difficulty: Math.ceil(difficulty * (spot.dist / (candidates[0]?.dist || 1))) },
      });
    }

    return placements;
  }

  /** Get expected enemy count for a difficulty level */
  getExpectedCount(difficulty: number): number {
    return Math.round(this.config.baseEnemyCount + difficulty * this.config.difficultyScale);
  }
}
