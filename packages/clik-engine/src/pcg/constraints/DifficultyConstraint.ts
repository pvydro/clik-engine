import { TileType } from '../PCGTypes';
import type { LevelConstraint, GeneratedLevel, PCGConfig, ConstraintResult } from '../PCGTypes';

/**
 * Validates that entity count and hazard density scale with difficulty.
 * Expected enemy count: difficulty * 2, with ±30% tolerance.
 */
export class DifficultyConstraint implements LevelConstraint {
  readonly name = 'difficulty';
  private tolerance: number;

  constructor(tolerance = 0.3) {
    this.tolerance = tolerance;
  }

  validate(level: GeneratedLevel, config: PCGConfig): ConstraintResult {
    const difficulty = config.difficulty ?? 5;
    const expectedEnemies = difficulty * 2;
    const minEnemies = Math.floor(expectedEnemies * (1 - this.tolerance));
    const maxEnemies = Math.ceil(expectedEnemies * (1 + this.tolerance));

    const enemyCount = level.entities.filter(e => e.type === 'enemy').length;

    if (enemyCount >= minEnemies && enemyCount <= maxEnemies) {
      return { passed: true, message: `Enemy count ${enemyCount} within expected range [${minEnemies}-${maxEnemies}]` };
    }

    return {
      passed: false,
      message: `Enemy count ${enemyCount} outside expected range [${minEnemies}-${maxEnemies}] for difficulty ${difficulty}`,
      details: { enemyCount, expected: expectedEnemies, min: minEnemies, max: maxEnemies },
    };
  }

  repair(level: GeneratedLevel, config: PCGConfig): GeneratedLevel {
    const difficulty = config.difficulty ?? 5;
    const expectedEnemies = difficulty * 2;
    const enemies = level.entities.filter(e => e.type === 'enemy');
    const nonEnemies = level.entities.filter(e => e.type !== 'enemy');

    if (enemies.length > Math.ceil(expectedEnemies * (1 + this.tolerance))) {
      // Too many — remove farthest from spawn
      enemies.sort((a, b) => {
        const distA = Math.abs(a.x - level.spawn.x) + Math.abs(a.y - level.spawn.y);
        const distB = Math.abs(b.x - level.spawn.x) + Math.abs(b.y - level.spawn.y);
        return distB - distA;
      });
      const target = Math.round(expectedEnemies);
      level.entities = [...nonEnemies, ...enemies.slice(0, target)];
    } else if (enemies.length < Math.floor(expectedEnemies * (1 - this.tolerance))) {
      // Too few — add enemies on floor tiles near existing enemies
      const target = Math.round(expectedEnemies);
      const toAdd = target - enemies.length;
      for (let i = 0; i < toAdd; i++) {
        // Find a floor tile that isn't spawn/exit
        const floor = level.grid.find(
          (tile, x, y) =>
            tile === TileType.FLOOR &&
            !(x === level.spawn.x && y === level.spawn.y) &&
            !(x === level.exit.x && y === level.exit.y) &&
            !level.entities.some(e => e.x === x && e.y === y),
        );
        if (floor) {
          level.entities.push({ type: 'enemy', x: floor.x, y: floor.y, properties: { difficulty } });
        }
      }
    }

    return level;
  }
}
