import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { ReachabilityConstraint } from '../../../src/pcg/constraints/ReachabilityConstraint';
import { Grid2D } from '../../../src/utils/structures';
import { TileType } from '../../../src/pcg/PCGTypes';
import type { GeneratedLevel } from '../../../src/pcg/PCGTypes';

function makeLevel(grid: Grid2D<TileType>, spawn: { x: number; y: number }, exit: { x: number; y: number }): GeneratedLevel {
  return {
    grid,
    entities: [],
    spawn,
    exit,
    metadata: { seed: 0, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('ReachabilityConstraint', () => {
  const constraint = new ReachabilityConstraint();

  it('passes when path exists from spawn to exit', () => {
    const grid = new Grid2D<TileType>(10, 10, TileType.WALL);
    // Carve a path
    for (let x = 1; x < 9; x++) grid.set(x, 5, TileType.FLOOR);
    grid.set(1, 5, TileType.SPAWN);
    grid.set(8, 5, TileType.EXIT);

    const level = makeLevel(grid, { x: 1, y: 5 }, { x: 8, y: 5 });
    const result = constraint.validate(level, { width: 10, height: 10 });
    expect(result.passed).toBe(true);
  });

  it('fails when no path exists', () => {
    const grid = new Grid2D<TileType>(10, 10, TileType.WALL);
    grid.set(1, 1, TileType.SPAWN);
    grid.set(8, 8, TileType.EXIT);
    // No floor connecting them

    const level = makeLevel(grid, { x: 1, y: 1 }, { x: 8, y: 8 });
    const result = constraint.validate(level, { width: 10, height: 10 });
    expect(result.passed).toBe(false);
  });

  it('repair carves a path to make spawn reach exit', () => {
    const grid = new Grid2D<TileType>(10, 10, TileType.WALL);
    grid.set(1, 1, TileType.FLOOR);
    grid.set(8, 8, TileType.EXIT);

    const level = makeLevel(grid, { x: 1, y: 1 }, { x: 8, y: 8 });

    // Before repair: unreachable
    expect(constraint.validate(level, { width: 10, height: 10 }).passed).toBe(false);

    // After repair: reachable
    const repaired = constraint.repair!(level, { width: 10, height: 10 });
    const result = constraint.validate(repaired, { width: 10, height: 10 });
    expect(result.passed).toBe(true);
  });

  it('repair does nothing if already reachable', () => {
    const grid = new Grid2D<TileType>(10, 10, TileType.WALL);
    for (let x = 1; x < 9; x++) grid.set(x, 5, TileType.FLOOR);
    grid.set(1, 5, TileType.SPAWN);
    grid.set(8, 5, TileType.EXIT);

    const level = makeLevel(grid, { x: 1, y: 5 }, { x: 8, y: 5 });
    const repaired = constraint.repair!(level, { width: 10, height: 10 });
    expect(repaired).toBe(level);
  });

  it('handles door tiles as walkable', () => {
    const grid = new Grid2D<TileType>(10, 10, TileType.WALL);
    grid.set(1, 5, TileType.FLOOR);
    grid.set(2, 5, TileType.DOOR);
    grid.set(3, 5, TileType.FLOOR);
    grid.set(1, 5, TileType.SPAWN);
    grid.set(3, 5, TileType.EXIT);

    const level = makeLevel(grid, { x: 1, y: 5 }, { x: 3, y: 5 });
    const result = constraint.validate(level, { width: 10, height: 10 });
    expect(result.passed).toBe(true);
  });
});
