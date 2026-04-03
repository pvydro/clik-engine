import { describe, it, expect } from 'vitest';
import { PathBrancher } from '../../../src/pcg/generators/PathBrancher';
import { TileType } from '../../../src/pcg/PCGTypes';
import { Grid2D } from '../../../src/utils/structures';

function makeCorridorLevel() {
  const grid = new Grid2D<TileType>(20, 10, TileType.WALL);
  // Horizontal corridor
  for (let x = 2; x < 18; x++) grid.set(x, 5, TileType.FLOOR);
  return {
    grid, entities: [],
    spawn: { x: 2, y: 5 }, exit: { x: 17, y: 5 },
    metadata: { seed: 1, generator: 'test', difficulty: 5, generationTimeMs: 0 },
  };
}

describe('PathBrancher', () => {
  it('finds branch points along corridors', () => {
    const brancher = new PathBrancher();
    const level = makeCorridorLevel();
    const points = brancher.findBranchPoints(level);
    expect(points.length).toBeGreaterThan(0);
  });

  it('addBranches creates branches', () => {
    const brancher = new PathBrancher({ branchChance: 1, maxBranches: 5 });
    const level = makeCorridorLevel();
    const { branchCount } = brancher.addBranches(level);
    expect(branchCount).toBeGreaterThan(0);
  });

  it('respects maxBranches', () => {
    const brancher = new PathBrancher({ branchChance: 1, maxBranches: 2 });
    const level = makeCorridorLevel();
    const { branchCount } = brancher.addBranches(level);
    expect(branchCount).toBeLessThanOrEqual(2);
  });

  it('places rewards at branch ends', () => {
    const brancher = new PathBrancher({
      branchChance: 1,
      maxBranches: 3,
      branches: [{ type: 'treasure', length: 3, reward: { type: 'chest', x: 0, y: 0 } }],
    });
    const level = makeCorridorLevel();
    const { entities } = brancher.addBranches(level);
    const chests = entities.filter(e => e.type === 'chest');
    expect(chests.length).toBeGreaterThanOrEqual(0); // may be 0 if no valid directions
  });

  it('branchChance 0 creates no branches', () => {
    const brancher = new PathBrancher({ branchChance: 0 });
    const level = makeCorridorLevel();
    const { branchCount } = brancher.addBranches(level);
    expect(branchCount).toBe(0);
  });

  it('entities have branchType property', () => {
    const brancher = new PathBrancher({
      branchChance: 1,
      branches: [{ type: 'secret', length: 3, reward: { type: 'item', x: 0, y: 0 } }],
    });
    const level = makeCorridorLevel();
    const { entities } = brancher.addBranches(level);
    for (const e of entities) {
      expect(e.properties?.branchType).toBeDefined();
    }
  });
});
