import { describe, it, expect } from 'vitest';
import { LootGenerator } from '../../../src/pcg/generators/LootGenerator';
import { TileType } from '../../../src/pcg/PCGTypes';
import { Grid2D } from '../../../src/utils/structures';

function makeLevel() {
  const grid = new Grid2D<TileType>(15, 15, TileType.WALL);
  for (let y = 2; y < 13; y++) {
    for (let x = 2; x < 13; x++) grid.set(x, y, TileType.FLOOR);
  }
  return {
    grid, entities: [],
    spawn: { x: 3, y: 3 }, exit: { x: 12, y: 12 },
    metadata: { seed: 1, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('LootGenerator', () => {
  it('generates loot placements', () => {
    const loot = new LootGenerator({
      table: [{ type: 'potion', weight: 10 }],
      baseCount: 3,
    });
    const items = loot.generate(makeLevel(), 5);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].type).toBe('potion');
  });

  it('scales count with difficulty', () => {
    const loot = new LootGenerator({ baseCount: 2, perDifficulty: 1 });
    const low = loot.generate(makeLevel(), 1);
    const high = loot.generate(makeLevel(), 10);
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it('respects minDifficulty on items', () => {
    const loot = new LootGenerator({
      table: [
        { type: 'common', weight: 10 },
        { type: 'rare', weight: 10, minDifficulty: 8 },
      ],
    });
    const lowItems = loot.getAvailableItems(3);
    const highItems = loot.getAvailableItems(8);
    expect(lowItems.map(i => i.type)).not.toContain('rare');
    expect(highItems.map(i => i.type)).toContain('rare');
  });

  it('does not place on spawn or exit', () => {
    const loot = new LootGenerator({ baseCount: 50 });
    const level = makeLevel();
    const items = loot.generate(level, 10);
    for (const item of items) {
      const isSpawn = item.x === level.spawn.x && item.y === level.spawn.y;
      const isExit = item.x === level.exit.x && item.y === level.exit.y;
      expect(isSpawn).toBe(false);
      expect(isExit).toBe(false);
    }
  });

  it('marks items with loot property', () => {
    const loot = new LootGenerator({ table: [{ type: 'gem', weight: 1 }] });
    const items = loot.generate(makeLevel(), 5);
    if (items.length > 0) {
      expect(items[0].properties?.loot).toBe(true);
    }
  });

  it('getTable returns the loot table', () => {
    const loot = new LootGenerator({ table: [{ type: 'a', weight: 1 }, { type: 'b', weight: 2 }] });
    expect(loot.getTable()).toHaveLength(2);
  });
});
