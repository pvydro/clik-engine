import { describe, it, expect } from 'vitest';
import { Grid2D } from '../../src/utils/structures';
import { findPath } from '../../src/utils/pathfinding';

describe('findPath (A*)', () => {
  it('finds a straight path', () => {
    const grid = new Grid2D(5, 1, 0);
    const path = findPath(grid, () => true, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toHaveLength(5);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[4]).toEqual({ x: 4, y: 0 });
  });

  it('navigates around walls', () => {
    // 0 = walkable, 1 = wall
    const grid = new Grid2D(5, 5, 0);
    // Wall in the middle column
    grid.set(2, 0, 1);
    grid.set(2, 1, 1);
    grid.set(2, 2, 1);
    grid.set(2, 3, 1);
    // Leave gap at bottom
    // grid.set(2, 4, 0) — already 0

    const path = findPath(grid, (v) => v === 0, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
    // Path should not go through walls
    for (const node of path) {
      expect(grid.get(node.x, node.y)).toBe(0);
    }
  });

  it('returns empty array when no path exists', () => {
    const grid = new Grid2D(5, 3, 0);
    // Complete wall
    for (let y = 0; y < 3; y++) grid.set(2, y, 1);

    const path = findPath(grid, (v) => v === 0, { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(path).toHaveLength(0);
  });

  it('handles start === goal', () => {
    const grid = new Grid2D(3, 3, 0);
    const path = findPath(grid, () => true, { x: 1, y: 1 }, { x: 1, y: 1 });
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ x: 1, y: 1 });
  });

  it('handles diagonal movement', () => {
    const grid = new Grid2D(3, 3, 0);
    const path = findPath(grid, () => true, { x: 0, y: 0 }, { x: 2, y: 2 }, true);
    // Diagonal should be shorter than cardinal-only
    expect(path.length).toBeLessThanOrEqual(3);
  });

  it('returns empty for out of bounds', () => {
    const grid = new Grid2D(3, 3, 0);
    expect(findPath(grid, () => true, { x: -1, y: 0 }, { x: 2, y: 2 })).toHaveLength(0);
  });
});
