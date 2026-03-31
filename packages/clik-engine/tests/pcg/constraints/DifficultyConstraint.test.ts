import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { DifficultyConstraint } from '../../../src/pcg/constraints/DifficultyConstraint';
import { Grid2D } from '../../../src/utils/structures';
import { TileType } from '../../../src/pcg/PCGTypes';
import type { GeneratedLevel, EntityPlacement } from '../../../src/pcg/PCGTypes';

function makeLevel(enemies: number): GeneratedLevel {
  const entities: EntityPlacement[] = [];
  const grid = new Grid2D<TileType>(20, 20, TileType.FLOOR);
  for (let i = 0; i < enemies; i++) {
    entities.push({ type: 'enemy', x: 3 + i, y: 5 });
  }
  entities.push({ type: 'item', x: 10, y: 10 }); // non-enemy
  return {
    grid,
    entities,
    spawn: { x: 1, y: 1 },
    exit: { x: 18, y: 18 },
    metadata: { seed: 0, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('DifficultyConstraint', () => {
  const constraint = new DifficultyConstraint(0.3);

  it('passes when enemy count matches difficulty', () => {
    // difficulty 5 → expected 10 enemies, ±30% → [7, 13]
    const level = makeLevel(10);
    const result = constraint.validate(level, { width: 20, height: 20, difficulty: 5 });
    expect(result.passed).toBe(true);
  });

  it('fails when too many enemies', () => {
    const level = makeLevel(20);
    const result = constraint.validate(level, { width: 20, height: 20, difficulty: 5 });
    expect(result.passed).toBe(false);
  });

  it('fails when too few enemies', () => {
    const level = makeLevel(1);
    const result = constraint.validate(level, { width: 20, height: 20, difficulty: 5 });
    expect(result.passed).toBe(false);
  });

  it('repair removes excess enemies', () => {
    const level = makeLevel(20);
    const repaired = constraint.repair!(level, { width: 20, height: 20, difficulty: 5 });
    const enemies = repaired.entities.filter(e => e.type === 'enemy').length;
    expect(enemies).toBe(10); // target = difficulty * 2
  });

  it('repair adds enemies when too few', () => {
    const level = makeLevel(1);
    const repaired = constraint.repair!(level, { width: 20, height: 20, difficulty: 5 });
    const enemies = repaired.entities.filter(e => e.type === 'enemy').length;
    expect(enemies).toBeGreaterThan(1);
  });
});
