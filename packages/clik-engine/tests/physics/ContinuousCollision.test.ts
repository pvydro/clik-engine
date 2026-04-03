import { describe, it, expect } from 'vitest';
import { ContinuousCollision } from '../../src/physics/ContinuousCollision';

describe('ContinuousCollision', () => {
  describe('sweep', () => {
    it('detects collision with static obstacle', () => {
      const mover = { x: 50, y: 50, width: 10, height: 10 };
      const velocity = { x: 0, y: -100 }; // moving up fast
      const wall = { x: 0, y: 0, width: 200, height: 10 }; // horizontal wall

      const result = ContinuousCollision.sweep(mover, velocity, wall);
      expect(result.hit).toBe(true);
      expect(result.t).toBeGreaterThan(0);
      expect(result.t).toBeLessThan(1);
      expect(result.normalY).toBe(1); // hit from below
    });

    it('returns no hit when moving away from obstacle', () => {
      const mover = { x: 50, y: 50, width: 10, height: 10 };
      const velocity = { x: 0, y: 100 }; // moving down, away from wall above
      const wall = { x: 0, y: 0, width: 200, height: 10 };

      const result = ContinuousCollision.sweep(mover, velocity, wall);
      expect(result.hit).toBe(false);
    });

    it('returns no hit when obstacle is too far', () => {
      const mover = { x: 50, y: 50, width: 10, height: 10 };
      const velocity = { x: 0, y: -10 }; // moving up slowly
      const wall = { x: 0, y: -500, width: 200, height: 10 }; // wall far above

      const result = ContinuousCollision.sweep(mover, velocity, wall);
      expect(result.hit).toBe(false);
    });

    it('detects horizontal collision', () => {
      const mover = { x: 10, y: 50, width: 10, height: 10 };
      const velocity = { x: 100, y: 0 }; // moving right
      const wall = { x: 80, y: 0, width: 10, height: 200 }; // vertical wall

      const result = ContinuousCollision.sweep(mover, velocity, wall);
      expect(result.hit).toBe(true);
      expect(result.normalX).toBe(-1); // hit from left side
    });

    it('returns no hit for zero velocity', () => {
      const mover = { x: 50, y: 50, width: 10, height: 10 };
      const wall = { x: 0, y: 0, width: 200, height: 10 };
      const result = ContinuousCollision.sweep(mover, { x: 0, y: 0 }, wall);
      expect(result.hit).toBe(false);
    });
  });

  describe('sweepAgainstAll', () => {
    it('returns the earliest hit', () => {
      const mover = { x: 50, y: 100, width: 10, height: 10 };
      const velocity = { x: 0, y: -200 };
      const walls = [
        { x: 0, y: 0, width: 200, height: 5 },   // far wall
        { x: 0, y: 50, width: 200, height: 5 },   // closer wall
      ];

      const result = ContinuousCollision.sweepAgainstAll(mover, velocity, walls);
      expect(result.hit).toBe(true);
      // Should hit the closer wall (y=50) first
      expect(result.t).toBeLessThan(0.5);
    });
  });

  describe('resolve', () => {
    it('moves to contact point and slides', () => {
      const result = ContinuousCollision.resolve(
        { x: 50, y: 50 },
        { x: 0, y: -100 },
        { t: 0.3, normalX: 0, normalY: 1, hit: true },
      );
      // Should move ~30% of velocity, then slide (no vertical component)
      expect(result.y).toBeLessThan(50);
      expect(result.vy).toBe(0); // vertical velocity zeroed after hitting horizontal surface
    });

    it('returns full movement when no hit', () => {
      const result = ContinuousCollision.resolve(
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { t: 1, normalX: 0, normalY: 0, hit: false },
      );
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });
  });

  describe('overlaps', () => {
    it('detects overlapping AABBs', () => {
      expect(ContinuousCollision.overlaps(
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 10, y: 10, width: 20, height: 20 },
      )).toBe(true);
    });

    it('detects non-overlapping AABBs', () => {
      expect(ContinuousCollision.overlaps(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 50, y: 50, width: 10, height: 10 },
      )).toBe(false);
    });
  });
});
