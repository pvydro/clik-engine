import { describe, bench } from 'vitest';
import { Grid2D } from '../../src/utils/structures';
import { findPath } from '../../src/utils/pathfinding';

function makeGrid(w: number, h: number, obstaclePct = 0): Grid2D<number> {
  const grid = new Grid2D<number>(w, h, 0);
  // Seed obstacles deterministically
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x * 7 + y * 13) % 100 < obstaclePct * 100) {
        grid.set(x, y, 1);
      }
    }
  }
  // Ensure start and goal are clear
  grid.set(0, 0, 0);
  grid.set(w - 1, h - 1, 0);
  return grid;
}

function makeMaze(w: number, h: number): Grid2D<number> {
  const grid = new Grid2D<number>(w, h, 1);
  // Carve corridors every other cell
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      grid.set(x, y, 0);
      // Connect to a random neighbor
      const dirs = [
        { dx: 2, dy: 0 },
        { dx: 0, dy: 2 },
      ];
      for (const d of dirs) {
        if (x + d.dx < w && y + d.dy < h) {
          grid.set(x + d.dx / 2, y + d.dy / 2, 0);
          grid.set(x + d.dx, y + d.dy, 0);
        }
      }
    }
  }
  grid.set(0, 0, 0);
  grid.set(w - 1, h - 1, 0);
  return grid;
}

const isWalkable = (v: number) => v === 0;

describe('Pathfinding Benchmarks', () => {
  const grid10 = makeGrid(10, 10);
  const grid50 = makeGrid(50, 50, 0.3);
  const grid100 = makeGrid(100, 100, 0.3);
  const maze100 = makeMaze(100, 100);

  bench('10x10 open grid', () => {
    findPath(grid10, isWalkable, { x: 0, y: 0 }, { x: 9, y: 9 });
  });

  bench('50x50 with 30% obstacles', () => {
    findPath(grid50, isWalkable, { x: 0, y: 0 }, { x: 49, y: 49 });
  });

  bench('100x100 with 30% obstacles', () => {
    findPath(grid100, isWalkable, { x: 0, y: 0 }, { x: 99, y: 99 });
  });

  bench('100x100 with 30% obstacles (diagonal)', () => {
    findPath(grid100, isWalkable, { x: 0, y: 0 }, { x: 99, y: 99 }, true);
  });

  bench('100x100 maze', () => {
    findPath(maze100, isWalkable, { x: 0, y: 0 }, { x: 98, y: 98 });
  });

  bench('100x100 unreachable goal', () => {
    // Block the goal area
    const blocked = makeGrid(100, 100, 0.3);
    // Surround goal with walls
    for (let x = 97; x < 100; x++) {
      for (let y = 97; y < 100; y++) {
        blocked.set(x, y, 1);
      }
    }
    findPath(blocked, isWalkable, { x: 0, y: 0 }, { x: 99, y: 99 });
  });
});
