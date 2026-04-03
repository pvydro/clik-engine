import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { CircularMovement } from '../../../src/entity/components/CircularMovement';
import { makeEntityMock } from '../../helpers/TestScene';

describe('CircularMovement', () => {
  it('positions entity on orbit', () => {
    const entity = makeEntityMock(0, 0);
    const circular = new CircularMovement({
      centerX: 100, centerY: 100, radius: 50, angularSpeed: 0, startAngle: 0,
    });
    circular.entity = entity as any;

    circular.update(16);
    expect(entity.x).toBeCloseTo(150, 0);
    expect(entity.y).toBeCloseTo(100, 0);
  });

  it('orbits around center', () => {
    const entity = makeEntityMock(0, 0);
    const circular = new CircularMovement({
      centerX: 0, centerY: 0, radius: 100, angularSpeed: Math.PI, startAngle: 0,
    });
    circular.entity = entity as any;

    // After half-second, should be at ~PI/2 radians
    circular.update(500);
    expect(entity.x).toBeCloseTo(0, 0);
    expect(entity.y).toBeCloseTo(100, 0);
  });

  it('setCenter updates orbit center', () => {
    const entity = makeEntityMock(0, 0);
    const circular = new CircularMovement({ radius: 50, angularSpeed: 0, startAngle: 0 });
    circular.entity = entity as any;

    circular.setCenter(200, 200);
    circular.update(16);
    expect(entity.x).toBeCloseTo(250, 0);
    expect(entity.y).toBeCloseTo(200, 0);
  });

  it('reset clears angle', () => {
    const entity = makeEntityMock(0, 0);
    const circular = new CircularMovement({ angularSpeed: Math.PI });
    circular.entity = entity as any;

    circular.update(1000);
    expect(circular.getAngle()).not.toBe(0);

    circular.reset();
    expect(circular.getAngle()).toBe(0);
  });
});
