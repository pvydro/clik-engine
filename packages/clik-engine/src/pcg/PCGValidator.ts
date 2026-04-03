import type { GeneratedLevel, PCGConfig, ConstraintResult, LevelConstraint } from './PCGTypes';
import { TileType } from './PCGTypes';

export interface ValidationResult {
  valid: boolean;
  results: { constraint: string; result: ConstraintResult }[];
  generationTimeMs?: number;
}

/**
 * Validates generated levels against constraints.
 * Runs all registered constraints and reports results.
 *
 * Usage:
 * ```
 * const validator = new PCGValidator();
 * validator.addConstraint(new ReachabilityConstraint());
 * validator.addConstraint(new DifficultyConstraint());
 * const result = validator.validate(level, config);
 * if (!result.valid) { regenerate(); }
 * ```
 */
export class PCGValidator {
  private constraints: LevelConstraint[] = [];

  /** Add a validation constraint */
  addConstraint(constraint: LevelConstraint): this {
    this.constraints.push(constraint);
    return this;
  }

  /** Remove a constraint by name */
  removeConstraint(name: string): this {
    this.constraints = this.constraints.filter(c => c.name !== name);
    return this;
  }

  /** Validate a level against all constraints */
  validate(level: GeneratedLevel, config: PCGConfig): ValidationResult {
    const results: { constraint: string; result: ConstraintResult }[] = [];
    let valid = true;

    for (const constraint of this.constraints) {
      const result = constraint.validate(level, config);
      results.push({ constraint: constraint.name, result });
      if (!result.passed) valid = false;
    }

    return { valid, results, generationTimeMs: level.metadata.generationTimeMs };
  }

  /**
   * Validate with auto-repair: if validation fails, attempt to fix and revalidate.
   * @param maxAttempts Max repair attempts
   */
  validateAndRepair(
    level: GeneratedLevel,
    config: PCGConfig,
    maxAttempts = 3,
  ): ValidationResult {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = this.validate(level, config);
      if (result.valid) return result;

      // Attempt repairs
      let repaired = false;
      for (const { constraint: name, result: cr } of result.results) {
        if (cr.passed) continue;
        const constraint = this.constraints.find(c => c.name === name);
        if (constraint?.repair) {
          constraint.repair(level, config);
          repaired = true;
        }
      }

      if (!repaired) return result; // No repairs possible
    }

    return this.validate(level, config);
  }

  /** Quick check: does the level have a reachable exit from spawn? */
  static isReachable(level: GeneratedLevel): boolean {
    const grid = level.grid;
    const visited = new Set<string>();
    const queue = [{ x: level.spawn.x, y: level.spawn.y }];
    visited.add(`${level.spawn.x},${level.spawn.y}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      if (x === level.exit.x && y === level.exit.y) return true;

      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (!grid.inBounds(nx, ny)) continue;
        const tile = grid.get(nx, ny);
        if (tile === TileType.WALL) continue;
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }

    return false;
  }

  /** Quick check: count floor tiles */
  static countFloorTiles(level: GeneratedLevel): number {
    const grid = level.grid;
    let count = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.get(x, y) === TileType.FLOOR) count++;
      }
    }
    return count;
  }

  /** Get constraint names */
  getConstraintNames(): string[] {
    return this.constraints.map(c => c.name);
  }

  get constraintCount(): number {
    return this.constraints.length;
  }
}
