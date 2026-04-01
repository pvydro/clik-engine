import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { PlatformerGenerator } from '../../../src/pcg/generators/PlatformerGenerator';
import { TileType } from '../../../src/pcg/PCGTypes';
import { SeededRandom } from '../../../src/utils/random';

describe('PlatformerGenerator', () => {
  const generator = new PlatformerGenerator();

  it('has correct name', () => {
    expect(generator.name).toBe('platformer');
  });

  it('produces grid of correct size', () => {
    const level = generator.generate({ width: 50, height: 20, seed: 1 }, new SeededRandom(1));
    expect(level.grid.width).toBe(50);
    expect(level.grid.height).toBe(20);
  });

  it('spawn is on the left side', () => {
    const level = generator.generate({ width: 50, height: 20, seed: 42 }, new SeededRandom(42));
    expect(level.spawn.x).toBeLessThan(10);
  });

  it('exit is on the right side', () => {
    const level = generator.generate({ width: 50, height: 20, seed: 42 }, new SeededRandom(42));
    expect(level.exit.x).toBeGreaterThan(40);
  });

  it('has ground terrain (wall tiles at bottom)', () => {
    const level = generator.generate({ width: 50, height: 20, seed: 42 }, new SeededRandom(42));
    let wallCount = 0;
    level.grid.forEach((tile) => { if (tile === TileType.WALL) wallCount++; });
    expect(wallCount).toBeGreaterThan(0);
  });

  it('places platforms', () => {
    const level = generator.generate(
      { width: 60, height: 20, seed: 42, params: { platformDensity: 0.8 } },
      new SeededRandom(42),
    );
    let platformCount = 0;
    level.grid.forEach((tile) => { if (tile === TileType.PLATFORM) platformCount++; });
    expect(platformCount).toBeGreaterThan(0);
  });

  it('is deterministic with same seed', () => {
    const a = generator.generate({ width: 50, height: 20, seed: 7 }, new SeededRandom(7));
    const b = generator.generate({ width: 50, height: 20, seed: 7 }, new SeededRandom(7));
    expect(a.spawn).toEqual(b.spawn);
    expect(a.exit).toEqual(b.exit);
  });

  it('places enemies and collectibles', () => {
    const level = generator.generate({ width: 50, height: 20, seed: 42, difficulty: 5 }, new SeededRandom(42));
    const enemies = level.entities.filter(e => e.type === 'enemy');
    const collectibles = level.entities.filter(e => e.type === 'collectible');
    expect(enemies.length).toBeGreaterThan(0);
    expect(collectibles.length).toBeGreaterThan(0);
  });
});
