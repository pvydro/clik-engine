import { describe, it, expect } from 'vitest';
import { Steering, SteeringCalculator } from '../../src/ai/SteeringBehaviors';

describe('Steering', () => {
  describe('seek', () => {
    it('steers toward target', () => {
      const force = Steering.seek({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, 50);
      expect(force.x).toBeGreaterThan(0);
      expect(force.y).toBeCloseTo(0, 5);
    });
  });

  describe('flee', () => {
    it('steers away from target', () => {
      const force = Steering.flee({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, 50);
      expect(force.x).toBeLessThan(0);
    });
  });

  describe('arrive', () => {
    it('decelerates near target', () => {
      const far = Steering.arrive({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 0 }, 100, 100);
      const near = Steering.arrive({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 0 }, 100, 100);
      expect(Math.abs(far.x)).toBeGreaterThan(Math.abs(near.x));
    });

    it('stops at target', () => {
      const force = Steering.arrive({ x: 100, y: 0 }, { x: 100, y: 0 }, { x: 10, y: 0 }, 100);
      expect(force.x).toBeLessThan(0); // Braking force
    });
  });

  describe('pursue', () => {
    it('leads the target', () => {
      const seekForce = Steering.seek({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 0 }, 100);
      const pursueForce = Steering.pursue(
        { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 0 },
        { x: 0, y: 0 }, 100
      );
      // Pursue should aim ahead of the target
      expect(pursueForce.x).toBeGreaterThanOrEqual(seekForce.x);
    });
  });

  describe('wander', () => {
    it('returns a force vector and updated angle', () => {
      const result = Steering.wander({ x: 50, y: 0 });
      expect(result.force).toBeDefined();
      expect(result.angle).toBeDefined();
      expect(typeof result.force.x).toBe('number');
      expect(typeof result.force.y).toBe('number');
    });
  });

  describe('separation', () => {
    it('pushes away from close neighbors', () => {
      const force = Steering.separation(
        { x: 0, y: 0 },
        [{ x: 10, y: 0 }, { x: 0, y: 10 }],
        50
      );
      expect(force.x).toBeLessThan(0);
      expect(force.y).toBeLessThan(0);
    });

    it('returns zero with no neighbors', () => {
      const force = Steering.separation({ x: 0, y: 0 }, []);
      expect(force.x).toBe(0);
      expect(force.y).toBe(0);
    });
  });

  describe('alignment', () => {
    it('steers toward average heading', () => {
      const force = Steering.alignment(
        { x: 0, y: 0 },
        [{ x: 50, y: 0 }, { x: 50, y: 0 }]
      );
      expect(force.x).toBe(50);
    });

    it('returns zero with no neighbors', () => {
      const force = Steering.alignment({ x: 10, y: 0 }, []);
      expect(force.x).toBe(0);
    });
  });

  describe('cohesion', () => {
    it('steers toward center of neighbors', () => {
      const force = Steering.cohesion(
        { x: 0, y: 0 },
        [{ x: 100, y: 0 }, { x: 100, y: 0 }],
        { x: 0, y: 0 },
        50
      );
      expect(force.x).toBeGreaterThan(0);
    });
  });

  describe('obstacleAvoidance', () => {
    it('steers away from obstacle', () => {
      const force = Steering.obstacleAvoidance(
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        [{ x: 80, y: 0, radius: 20 }],
        100
      );
      expect(force.x !== 0 || force.y !== 0).toBe(true);
    });

    it('returns zero with no obstacles', () => {
      const force = Steering.obstacleAvoidance(
        { x: 0, y: 0 }, { x: 50, y: 0 }, [], 100
      );
      expect(force.x).toBe(0);
      expect(force.y).toBe(0);
    });
  });
});

describe('SteeringCalculator', () => {
  it('combines weighted forces', () => {
    const calc = new SteeringCalculator(1000);
    calc.add({ x: 10, y: 0 }, 1);
    calc.add({ x: 0, y: 20 }, 0.5);
    const result = calc.calculate();
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
  });

  it('truncates to max force', () => {
    const calc = new SteeringCalculator(10);
    calc.add({ x: 100, y: 0 }, 1);
    const result = calc.calculate();
    expect(result.x).toBeCloseTo(10, 1);
  });

  it('clears after calculate', () => {
    const calc = new SteeringCalculator(1000);
    calc.add({ x: 10, y: 0 });
    calc.calculate();
    const empty = calc.calculate();
    expect(empty.x).toBe(0);
    expect(empty.y).toBe(0);
  });

  it('chains add calls', () => {
    const calc = new SteeringCalculator();
    const result = calc.add({ x: 1, y: 0 }).add({ x: 0, y: 1 }).clear();
    expect(result).toBe(calc);
  });
});
