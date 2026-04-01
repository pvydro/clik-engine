import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { EntityDensityConstraint } from '../../../src/pcg/constraints/EntityDensityConstraint';
import { Grid2D } from '../../../src/utils/structures';
import { TileType } from '../../../src/pcg/PCGTypes';
import type { GeneratedLevel } from '../../../src/pcg/PCGTypes';

function makeLevel(entities: { type: string; x: number; y: number }[]): GeneratedLevel {
  return {
    grid: new Grid2D<TileType>(20, 20, TileType.FLOOR),
    entities,
    spawn: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    metadata: { seed: 0, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('EntityDensityConstraint', () => {
  it('passes when entity density is within limits', () => {
    const constraint = new EntityDensityConstraint(8, 4);
    const level = makeLevel([
      { type: 'enemy', x: 2, y: 2 },
      { type: 'enemy', x: 10, y: 10 },
    ]);
    const result = constraint.validate(level, { width: 20, height: 20 });
    expect(result.passed).toBe(true);
  });

  it('fails when too many entities in one region', () => {
    const constraint = new EntityDensityConstraint(8, 2);
    const level = makeLevel([
      { type: 'enemy', x: 1, y: 1 },
      { type: 'enemy', x: 2, y: 2 },
      { type: 'enemy', x: 3, y: 3 },
    ]);
    const result = constraint.validate(level, { width: 20, height: 20 });
    expect(result.passed).toBe(false);
  });

  it('repair removes excess entities from densest region', () => {
    const constraint = new EntityDensityConstraint(8, 2);
    const level = makeLevel([
      { type: 'enemy', x: 1, y: 1 },
      { type: 'enemy', x: 2, y: 2 },
      { type: 'enemy', x: 3, y: 3 },
      { type: 'enemy', x: 4, y: 4 },
    ]);
    const repaired = constraint.repair!(level, { width: 20, height: 20 });
    const result = constraint.validate(repaired, { width: 20, height: 20 });
    expect(result.passed).toBe(true);
    expect(repaired.entities.length).toBe(2);
  });

  it('respects custom region size', () => {
    const constraint = new EntityDensityConstraint(4, 2);
    // These are in the same 4x4 region
    const level = makeLevel([
      { type: 'enemy', x: 1, y: 1 },
      { type: 'enemy', x: 2, y: 2 },
      { type: 'enemy', x: 3, y: 3 },
    ]);
    const result = constraint.validate(level, { width: 20, height: 20 });
    expect(result.passed).toBe(false);
  });

  it('passes with entities spread across regions', () => {
    const constraint = new EntityDensityConstraint(8, 2);
    const level = makeLevel([
      { type: 'enemy', x: 1, y: 1 },
      { type: 'enemy', x: 2, y: 2 },
      { type: 'enemy', x: 10, y: 10 },
      { type: 'enemy', x: 11, y: 11 },
    ]);
    const result = constraint.validate(level, { width: 20, height: 20 });
    expect(result.passed).toBe(true);
  });
});
