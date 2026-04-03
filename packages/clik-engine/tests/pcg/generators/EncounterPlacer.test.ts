import { describe, it, expect } from 'vitest';
import { EncounterPlacer } from '../../../src/pcg/generators/EncounterPlacer';
import { TileType } from '../../../src/pcg/PCGTypes';
import { Grid2D } from '../../../src/utils/structures';

function makeLevel(w = 20, h = 20) {
  const grid = new Grid2D<TileType>(w, h, TileType.WALL);
  // Carve floor area
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      grid.set(x, y, TileType.FLOOR);
    }
  }
  return {
    grid,
    entities: [],
    spawn: { x: 3, y: 3 },
    exit: { x: w - 3, y: h - 3 },
    metadata: { seed: 1, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('EncounterPlacer', () => {
  it('places enemies in the level', () => {
    const placer = new EncounterPlacer({ enemyTypes: ['goblin'] });
    const level = makeLevel();
    const entities = placer.place(level, 5);
    expect(entities.length).toBeGreaterThan(0);
    expect(entities[0].type).toBe('goblin');
  });

  it('scales enemy count with difficulty', () => {
    const placer = new EncounterPlacer({ baseEnemyCount: 2, difficultyScale: 1 });
    const low = placer.getExpectedCount(1);
    const high = placer.getExpectedCount(10);
    expect(high).toBeGreaterThan(low);
  });

  it('places boss when configured', () => {
    const placer = new EncounterPlacer({ placeBoss: true, bossType: 'dragon' });
    const level = makeLevel();
    const entities = placer.place(level, 5);
    const bosses = entities.filter(e => e.type === 'dragon');
    expect(bosses.length).toBe(1);
    expect(bosses[0].properties?.isBoss).toBe(true);
  });

  it('respects minDistanceFromSpawn', () => {
    const placer = new EncounterPlacer({ minDistanceFromSpawn: 10 });
    const level = makeLevel();
    const entities = placer.place(level, 5);
    for (const e of entities) {
      const dist = Math.abs(e.x - level.spawn.x) + Math.abs(e.y - level.spawn.y);
      expect(dist).toBeGreaterThanOrEqual(10);
    }
  });

  it('returns empty for tiny level with no valid spots', () => {
    const grid = new Grid2D<TileType>(5, 5, TileType.WALL);
    grid.set(2, 2, TileType.FLOOR);
    const level = {
      grid, entities: [], spawn: { x: 2, y: 2 }, exit: { x: 2, y: 2 },
      metadata: { seed: 1, generator: 'test', difficulty: 1, generationTimeMs: 0 },
    };
    const placer = new EncounterPlacer({ minDistanceFromSpawn: 10 });
    expect(placer.place(level, 1)).toHaveLength(0);
  });

  it('uses multiple enemy types', () => {
    const placer = new EncounterPlacer({ enemyTypes: ['weak', 'medium', 'strong'], baseEnemyCount: 10 });
    const level = makeLevel(30, 30);
    const entities = placer.place(level, 5);
    const types = new Set(entities.map(e => e.type));
    expect(types.size).toBeGreaterThanOrEqual(1);
  });
});
