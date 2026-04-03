import { describe, it, expect, vi } from 'vitest';
import { PCGValidator } from '../../src/pcg/PCGValidator';
import { TileType } from '../../src/pcg/PCGTypes';
import { Grid2D } from '../../src/utils/structures';
import type { GeneratedLevel, PCGConfig, LevelConstraint } from '../../src/pcg/PCGTypes';

function makeLevel(reachable = true): GeneratedLevel {
  const grid = new Grid2D<TileType>(10, 10, TileType.WALL);
  // Carve path from spawn to exit
  for (let x = 1; x < 9; x++) grid.set(x, 5, TileType.FLOOR);
  if (!reachable) grid.set(5, 5, TileType.WALL); // block path
  return {
    grid, entities: [],
    spawn: { x: 1, y: 5 }, exit: { x: 8, y: 5 },
    metadata: { seed: 1, generator: 'test', difficulty: 5, generationTimeMs: 10 },
  };
}

function makeConstraint(name: string, passes: boolean): LevelConstraint {
  return {
    name,
    validate: () => ({ passed: passes, message: passes ? 'ok' : 'failed' }),
  };
}

describe('PCGValidator', () => {
  it('validates against all constraints', () => {
    const validator = new PCGValidator();
    validator.addConstraint(makeConstraint('a', true));
    validator.addConstraint(makeConstraint('b', true));

    const result = validator.validate(makeLevel(), { width: 10, height: 10 });
    expect(result.valid).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('reports failure when any constraint fails', () => {
    const validator = new PCGValidator();
    validator.addConstraint(makeConstraint('pass', true));
    validator.addConstraint(makeConstraint('fail', false));

    const result = validator.validate(makeLevel(), { width: 10, height: 10 });
    expect(result.valid).toBe(false);
  });

  it('removeConstraint removes by name', () => {
    const validator = new PCGValidator();
    validator.addConstraint(makeConstraint('a', true));
    validator.removeConstraint('a');
    expect(validator.constraintCount).toBe(0);
  });

  it('validateAndRepair attempts repair', () => {
    const repairFn = vi.fn();
    const constraint: LevelConstraint = {
      name: 'fixable',
      validate: vi.fn()
        .mockReturnValueOnce({ passed: false, message: 'broken' })
        .mockReturnValue({ passed: true, message: 'fixed' }),
      repair: repairFn,
    };

    const validator = new PCGValidator();
    validator.addConstraint(constraint);

    const result = validator.validateAndRepair(makeLevel(), { width: 10, height: 10 });
    expect(repairFn).toHaveBeenCalled();
    expect(result.valid).toBe(true);
  });

  it('validateAndRepair gives up after maxAttempts', () => {
    const constraint: LevelConstraint = {
      name: 'unfixable',
      validate: () => ({ passed: false, message: 'broken' }),
      repair: vi.fn(),
    };

    const validator = new PCGValidator();
    validator.addConstraint(constraint);

    const result = validator.validateAndRepair(makeLevel(), { width: 10, height: 10 }, 2);
    expect(result.valid).toBe(false);
  });

  it('isReachable returns true for connected level', () => {
    expect(PCGValidator.isReachable(makeLevel(true))).toBe(true);
  });

  it('isReachable returns false for blocked level', () => {
    expect(PCGValidator.isReachable(makeLevel(false))).toBe(false);
  });

  it('countFloorTiles counts correctly', () => {
    const level = makeLevel();
    expect(PCGValidator.countFloorTiles(level)).toBe(8); // 8 floor tiles in corridor
  });

  it('getConstraintNames returns all names', () => {
    const validator = new PCGValidator();
    validator.addConstraint(makeConstraint('x', true));
    validator.addConstraint(makeConstraint('y', true));
    expect(validator.getConstraintNames()).toEqual(['x', 'y']);
  });
});
