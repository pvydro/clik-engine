import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { ArenaGenerator } from '../../../src/pcg/generators/ArenaGenerator';
import { TileType } from '../../../src/pcg/PCGTypes';
import { SeededRandom } from '../../../src/utils/random';

describe('ArenaGenerator', () => {
  const generator = new ArenaGenerator();

  it('has correct name', () => {
    expect(generator.name).toBe('arena');
  });

  it('produces grid of correct size', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 1 }, new SeededRandom(1));
    expect(level.grid.width).toBe(30);
    expect(level.grid.height).toBe(30);
  });

  it('spawn is at center', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    expect(level.spawn.x).toBe(15);
    expect(level.spawn.y).toBe(15);
  });

  it('has floor tiles in arena area', () => {
    const level = generator.generate({ width: 30, height: 30, seed: 42 }, new SeededRandom(42));
    let floorCount = 0;
    level.grid.forEach((tile) => { if (tile === TileType.FLOOR) floorCount++; });
    expect(floorCount).toBeGreaterThan(100);
  });

  it('circle shape creates circular arena', () => {
    const level = generator.generate(
      { width: 30, height: 30, seed: 42, params: { shape: 'circle' } },
      new SeededRandom(42),
    );
    // Corner should be wall, center should be walkable
    expect(level.grid.get(0, 0)).toBe(TileType.WALL);
    const center = level.grid.get(15, 15);
    expect(center === TileType.SPAWN || center === TileType.FLOOR).toBe(true);
  });

  it('places enemies symmetrically', () => {
    const level = generator.generate(
      { width: 30, height: 30, seed: 42, difficulty: 5, params: { symmetry: 4 } },
      new SeededRandom(42),
    );
    expect(level.entities.length).toBeGreaterThan(0);
    expect(level.entities.every(e => e.type === 'enemy')).toBe(true);
  });
});
