import { describe, it, expect } from 'vitest';
import { PathSteering } from '../../src/ai/PathSteering';
import { Grid2D } from '../../src/utils/structures';

describe('PathSteering', () => {
  function makeGrid(w: number, h: number, blocked: { x: number; y: number }[] = []) {
    const grid = new Grid2D<number>(w, h, 0);
    for (const b of blocked) grid.set(b.x, b.y, 1);
    return grid;
  }

  const isWalkable = (v: number) => v === 0;

  it('finds a path on an open grid', () => {
    const grid = makeGrid(10, 10);
    const ps = new PathSteering(grid, isWalkable);
    const found = ps.setPath({ x: 0, y: 0 }, { x: 9, y: 9 });
    expect(found).toBe(true);
    expect(ps.hasPath()).toBe(true);
    expect(ps.getPath().length).toBeGreaterThan(0);
  });

  it('returns false when no path exists', () => {
    const grid = makeGrid(5, 5);
    // Wall across the middle
    for (let x = 0; x < 5; x++) grid.set(x, 2, 1);
    const ps = new PathSteering(grid, isWalkable, { diagonal: false });
    const found = ps.setPath({ x: 0, y: 0 }, { x: 0, y: 4 });
    expect(found).toBe(false);
  });

  it('calculate returns steering force toward next waypoint', () => {
    const grid = makeGrid(10, 10);
    const ps = new PathSteering(grid, isWalkable, { maxSpeed: 100 });
    ps.setPath({ x: 0, y: 0 }, { x: 5, y: 0 });

    const force = ps.calculate({ x: 0, y: 0 }, 16);
    expect(force.x).toBeGreaterThan(0); // should push right
  });

  it('returns zero force when path complete', () => {
    const grid = makeGrid(10, 10);
    const ps = new PathSteering(grid, isWalkable, { waypointRadius: 100 });
    ps.setPath({ x: 0, y: 0 }, { x: 1, y: 0 });

    // Position is already near the goal
    const force = ps.calculate({ x: 1, y: 0 }, 16);
    expect(force.x).toBeCloseTo(0, 0);
    expect(force.y).toBeCloseTo(0, 0);
  });

  it('advances waypoints as entity moves', () => {
    const grid = makeGrid(10, 10);
    const ps = new PathSteering(grid, isWalkable, { waypointRadius: 2 });
    ps.setPath({ x: 0, y: 0 }, { x: 5, y: 0 });

    expect(ps.getCurrentWaypointIndex()).toBe(0);
    // Simulate being at waypoint 1
    ps.calculate({ x: 1, y: 0 }, 16);
    expect(ps.getCurrentWaypointIndex()).toBeGreaterThanOrEqual(0);
  });

  it('clearPath resets state', () => {
    const grid = makeGrid(10, 10);
    const ps = new PathSteering(grid, isWalkable);
    ps.setPath({ x: 0, y: 0 }, { x: 5, y: 5 });
    ps.clearPath();
    expect(ps.hasPath()).toBe(false);
    expect(ps.isComplete()).toBe(true);
  });

  it('isComplete returns true when no path', () => {
    const grid = makeGrid(10, 10);
    const ps = new PathSteering(grid, isWalkable);
    expect(ps.isComplete()).toBe(true);
  });
});
