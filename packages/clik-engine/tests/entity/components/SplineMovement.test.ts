import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { SplineMovement } from '../../../src/entity/components/SplineMovement';
import { makeEntityMock } from '../../helpers/TestScene';

describe('SplineMovement', () => {
  const simplePath = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it('starts at beginning of path', () => {
    const entity = makeEntityMock(0, 0);
    const spline = new SplineMovement({ points: simplePath, speed: 100 });
    spline.entity = entity as any;

    expect(spline.getProgress()).toBe(0);
    expect(spline.isCompleted()).toBe(false);
  });

  it('moves along path over time', () => {
    const entity = makeEntityMock(0, 0);
    const spline = new SplineMovement({ points: simplePath, speed: 100 });
    spline.entity = entity as any;

    spline.update(500);
    expect(spline.getProgress()).toBeGreaterThan(0);
    expect(entity.x).not.toBe(0);
  });

  it('fires onComplete when reaching end', () => {
    const cb = vi.fn();
    const entity = makeEntityMock(0, 0);
    const spline = new SplineMovement({ points: simplePath, speed: 10000 });
    spline.entity = entity as any;
    spline.onComplete(cb);

    // Run enough time to complete
    spline.update(10000);
    expect(spline.isCompleted()).toBe(true);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('loops when loop is true', () => {
    const entity = makeEntityMock(0, 0);
    const spline = new SplineMovement({ points: simplePath, speed: 10000, loop: true });
    spline.entity = entity as any;

    spline.update(10000);
    expect(spline.isCompleted()).toBe(false);
    expect(spline.getProgress()).toBeLessThan(1);
  });

  it('reset clears progress', () => {
    const entity = makeEntityMock(0, 0);
    const spline = new SplineMovement({ points: simplePath, speed: 10000 });
    spline.entity = entity as any;

    spline.update(10000);
    expect(spline.isCompleted()).toBe(true);

    spline.reset();
    expect(spline.getProgress()).toBe(0);
    expect(spline.isCompleted()).toBe(false);
  });
});
