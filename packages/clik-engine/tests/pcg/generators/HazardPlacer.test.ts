import { describe, it, expect } from 'vitest';
import { HazardPlacer } from '../../../src/pcg/generators/HazardPlacer';
import { TileType } from '../../../src/pcg/PCGTypes';
import { Grid2D } from '../../../src/utils/structures';

function makeLevel() {
  const grid = new Grid2D<TileType>(20, 20, TileType.WALL);
  for (let y = 2; y < 18; y++) {
    for (let x = 2; x < 18; x++) grid.set(x, y, TileType.FLOOR);
  }
  return {
    grid, entities: [],
    spawn: { x: 3, y: 3 }, exit: { x: 17, y: 17 },
    metadata: { seed: 1, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('HazardPlacer', () => {
  it('places hazards in the level', () => {
    const placer = new HazardPlacer({ hazards: [{ type: 'spike', minSpacing: 2 }] });
    const hazards = placer.place(makeLevel(), 5);
    expect(hazards.length).toBeGreaterThan(0);
    expect(hazards[0].type).toBe('spike');
  });

  it('scales count with difficulty', () => {
    const placer = new HazardPlacer({ baseCount: 2, perDifficulty: 1 });
    expect(placer.getExpectedCount(1)).toBe(3);
    expect(placer.getExpectedCount(10)).toBe(12);
  });

  it('respects minDistanceFromSpawn', () => {
    const placer = new HazardPlacer({ minDistanceFromSpawn: 5 });
    const level = makeLevel();
    const hazards = placer.place(level, 5);
    for (const h of hazards) {
      const dist = Math.abs(h.x - level.spawn.x) + Math.abs(h.y - level.spawn.y);
      expect(dist).toBeGreaterThanOrEqual(5);
    }
  });

  it('respects minSpacing between same-type hazards', () => {
    const placer = new HazardPlacer({
      hazards: [{ type: 'spike', minSpacing: 5 }],
      baseCount: 20,
    });
    const hazards = placer.place(makeLevel(), 10);
    for (let i = 0; i < hazards.length; i++) {
      for (let j = i + 1; j < hazards.length; j++) {
        const dist = Math.abs(hazards[i].x - hazards[j].x) + Math.abs(hazards[i].y - hazards[j].y);
        expect(dist).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('does not place on spawn or exit', () => {
    const placer = new HazardPlacer({ baseCount: 50 });
    const level = makeLevel();
    const hazards = placer.place(level, 10);
    for (const h of hazards) {
      expect(h.x === level.spawn.x && h.y === level.spawn.y).toBe(false);
      expect(h.x === level.exit.x && h.y === level.exit.y).toBe(false);
    }
  });

  it('marks entities with hazard property', () => {
    const placer = new HazardPlacer();
    const hazards = placer.place(makeLevel(), 5);
    for (const h of hazards) {
      expect(h.properties?.hazard).toBe(true);
    }
  });

  it('optionally sets tileType', () => {
    const placer = new HazardPlacer({
      hazards: [{ type: 'lava', tileType: TileType.HAZARD, minSpacing: 2 }],
    });
    const level = makeLevel();
    const hazards = placer.place(level, 5);
    if (hazards.length > 0) {
      expect(level.grid.get(hazards[0].x, hazards[0].y)).toBe(TileType.HAZARD);
    }
  });
});
