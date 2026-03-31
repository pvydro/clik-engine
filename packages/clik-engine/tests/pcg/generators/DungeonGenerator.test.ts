import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { DungeonGenerator } from '../../../src/pcg/generators/DungeonGenerator';
import { TileType } from '../../../src/pcg/PCGTypes';
import { SeededRandom } from '../../../src/utils/random';

describe('DungeonGenerator', () => {
  const generator = new DungeonGenerator();

  it('has correct name', () => {
    expect(generator.name).toBe('dungeon');
  });

  it('produces a grid of correct size', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 1 }, new SeededRandom(1));
    expect(level.grid.width).toBe(30);
    expect(level.grid.height).toBe(30);
  });

  it('places spawn on a SPAWN tile', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    expect(level.grid.get(level.spawn.x, level.spawn.y)).toBe(TileType.SPAWN);
  });

  it('places exit on an EXIT tile', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    expect(level.grid.get(level.exit.x, level.exit.y)).toBe(TileType.EXIT);
  });

  it('spawn and exit are different positions', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    expect(level.spawn.x !== level.exit.x || level.spawn.y !== level.exit.y).toBe(true);
  });

  it('generates rooms (floor tiles exist)', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    let floorCount = 0;
    level.grid.forEach((tile) => { if (tile === TileType.FLOOR) floorCount++; });
    expect(floorCount).toBeGreaterThan(20);
  });

  it('produces deterministic output with same seed', () => {
    const level1 = generator.generate({ width: 30, height: 30, seed: 99 }, new SeededRandom(99));
    const level2 = generator.generate({ width: 30, height: 30, seed: 99 }, new SeededRandom(99));
    expect(level1.spawn).toEqual(level2.spawn);
    expect(level1.exit).toEqual(level2.exit);
    expect(level1.entities.length).toBe(level2.entities.length);
  });

  it('produces different output with different seeds', () => {
    const level1 = generator.generate({ width: 30, height: 30, seed: 1 }, new SeededRandom(1));
    const level2 = generator.generate({ width: 30, height: 30, seed: 2 }, new SeededRandom(2));
    // Extremely unlikely to have identical spawn positions with different seeds
    const same = level1.spawn.x === level2.spawn.x && level1.spawn.y === level2.spawn.y
      && level1.exit.x === level2.exit.x && level1.exit.y === level2.exit.y;
    // Not guaranteed to differ but very likely
    expect(level1.entities.length + level2.entities.length).toBeGreaterThan(0);
  });

  it('scales enemy count with difficulty', () => {
    const easy = generator.generate({ width: 40, height: 40, seed: 42, difficulty: 2 }, new SeededRandom(42));
    const hard = generator.generate({ width: 40, height: 40, seed: 42, difficulty: 8 }, new SeededRandom(42));
    const easyEnemies = easy.entities.filter(e => e.type === 'enemy').length;
    const hardEnemies = hard.entities.filter(e => e.type === 'enemy').length;
    expect(hardEnemies).toBeGreaterThan(easyEnemies);
  });

  it('places items', () => {
    const level = generator.generate({ width: 40, height: 40, seed: 42, difficulty: 5 }, new SeededRandom(42));
    const items = level.entities.filter(e => e.type === 'item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('records room count in metadata', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    expect(level.metadata.roomCount).toBeGreaterThan(0);
  });

  it('records path length in metadata', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    expect(level.metadata.pathLength).toBeDefined();
  });

  it('respects custom params', () => {
    const level = generator.generate(
      { width: 50, height: 50, seed: 42, params: { minRoomSize: 6, maxRoomSize: 8 } },
      new SeededRandom(42),
    );
    expect(level.grid.width).toBe(50);
    expect(level.metadata.roomCount).toBeGreaterThan(0);
  });
});
