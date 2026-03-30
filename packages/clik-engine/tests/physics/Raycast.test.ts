import { describe, it, expect, vi } from 'vitest';
import { makeTestScene } from '../helpers/TestScene';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { Raycast } from '../../src/physics/Raycast';

function makeObj(x: number, y: number, w = 32, h = 32) {
  return {
    x,
    y,
    body: { x, y, width: w, height: h },
  } as any;
}

describe('Raycast', () => {
  const scene = makeTestScene();

  describe('rayVsRect', () => {
    it('returns hit when ray intersects rectangle', () => {
      const hit = Raycast.rayVsRect(0, 16, 1, 0, 200, 50, 0, 32, 32);
      expect(hit).not.toBeNull();
      expect(hit!.distance).toBeCloseTo(50);
      expect(hit!.x).toBeCloseTo(50);
    });

    it('returns null when ray misses', () => {
      const hit = Raycast.rayVsRect(0, 100, 1, 0, 200, 50, 0, 32, 32);
      expect(hit).toBeNull();
    });

    it('returns null for zero-length direction', () => {
      const hit = Raycast.cast(scene as any, 0, 0, 0, 0, 100, [makeObj(50, 0)]);
      expect(hit).toBeNull();
    });

    it('returns null when beyond max distance', () => {
      const hit = Raycast.rayVsRect(0, 16, 1, 0, 30, 50, 0, 32, 32);
      expect(hit).toBeNull();
    });
  });

  describe('cast', () => {
    it('returns the closest hit object', () => {
      const near = makeObj(50, 0);
      const far = makeObj(150, 0);
      const hit = Raycast.cast(scene as any, 0, 16, 1, 0, 500, [far, near]);
      expect(hit).not.toBeNull();
      expect(hit!.object).toBe(near);
    });

    it('returns null when no objects hit', () => {
      const obj = makeObj(50, 200); // far away from ray y=16
      const hit = Raycast.cast(scene as any, 0, 16, 1, 0, 500, [obj]);
      expect(hit).toBeNull();
    });

    it('skips objects without body', () => {
      const noBody = { x: 50, y: 16 } as any;
      const hit = Raycast.cast(scene as any, 0, 16, 1, 0, 500, [noBody]);
      expect(hit).toBeNull();
    });
  });

  describe('lineOfSight', () => {
    it('returns true when no obstacles block the line', () => {
      const result = Raycast.lineOfSight(scene as any, 0, 16, 200, 16, []);
      expect(result).toBe(true);
    });

    it('returns false when obstacle blocks the line', () => {
      const wall = makeObj(100, 0, 32, 32);
      const result = Raycast.lineOfSight(scene as any, 0, 16, 200, 16, [wall]);
      expect(result).toBe(false);
    });

    it('returns true when obstacle is not in the path', () => {
      const wall = makeObj(100, 200, 32, 32);
      const result = Raycast.lineOfSight(scene as any, 0, 16, 200, 16, [wall]);
      expect(result).toBe(true);
    });
  });

  describe('queryCircle', () => {
    it('returns objects within radius', () => {
      const inside = makeObj(10, 10);
      const outside = makeObj(200, 200);
      const results = Raycast.queryCircle([inside, outside], 0, 0, 50);
      expect(results).toEqual([inside]);
    });

    it('returns empty array when nothing in range', () => {
      const results = Raycast.queryCircle([makeObj(200, 200)], 0, 0, 10);
      expect(results).toEqual([]);
    });

    it('includes objects exactly on the boundary', () => {
      // Distance = 50, radius = 50
      const onEdge = makeObj(50, 0);
      const results = Raycast.queryCircle([onEdge], 0, 0, 50);
      expect(results).toEqual([onEdge]);
    });
  });

  describe('queryRect', () => {
    it('returns objects within rectangle', () => {
      const inside = makeObj(15, 15);
      const outside = makeObj(200, 200);
      const results = Raycast.queryRect([inside, outside], 0, 0, 100, 100);
      expect(results).toEqual([inside]);
    });

    it('returns empty array when nothing in bounds', () => {
      const results = Raycast.queryRect([makeObj(200, 200)], 0, 0, 50, 50);
      expect(results).toEqual([]);
    });
  });

  describe('nearest', () => {
    it('returns the closest object', () => {
      const near = makeObj(5, 5);
      const far = makeObj(100, 100);
      const result = Raycast.nearest([far, near], 0, 0);
      expect(result).toBe(near);
    });

    it('returns null for empty array', () => {
      expect(Raycast.nearest([], 0, 0)).toBeNull();
    });
  });
});
