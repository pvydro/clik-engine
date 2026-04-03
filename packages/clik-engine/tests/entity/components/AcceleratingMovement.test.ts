import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { AcceleratingMovement, MovementEasing } from '../../../src/entity/components/AcceleratingMovement';
import { makeEntityMock } from '../../helpers/TestScene';

describe('AcceleratingMovement', () => {
  it('starts at startSpeed', () => {
    const accel = new AcceleratingMovement({
      startSpeed: 0, endSpeed: 100, duration: 1000, easing: MovementEasing.linear,
    });
    expect(accel.getCurrentSpeed()).toBe(0);
  });

  it('accelerates over time with linear easing', () => {
    const entity = makeEntityMock(0, 0);
    const accel = new AcceleratingMovement({
      angle: 0, startSpeed: 0, endSpeed: 200, duration: 1000, easing: MovementEasing.linear,
    });
    accel.entity = entity as any;

    accel.update(500); // halfway
    expect(accel.getCurrentSpeed()).toBeCloseTo(100, 0);
  });

  it('reaches endSpeed at duration', () => {
    const accel = new AcceleratingMovement({
      startSpeed: 0, endSpeed: 300, duration: 1000, easing: MovementEasing.linear,
    });
    const entity = makeEntityMock(0, 0);
    accel.entity = entity as any;

    accel.update(1000);
    expect(accel.getCurrentSpeed()).toBeCloseTo(300, 0);
  });

  it('caps speed at endSpeed after duration', () => {
    const accel = new AcceleratingMovement({
      startSpeed: 0, endSpeed: 300, duration: 1000, easing: MovementEasing.linear,
    });
    const entity = makeEntityMock(0, 0);
    accel.entity = entity as any;

    accel.update(2000);
    expect(accel.getCurrentSpeed()).toBeCloseTo(300, 0);
  });

  it('moves entity in specified angle', () => {
    const entity = makeEntityMock(0, 0);
    const accel = new AcceleratingMovement({
      angle: Math.PI / 2, startSpeed: 100, endSpeed: 100, duration: 1000, easing: MovementEasing.linear,
    });
    accel.entity = entity as any;

    accel.update(1000);
    expect(entity.x).toBeCloseTo(0, 0);
    expect(entity.y).toBeCloseTo(100, 0);
  });

  it('easeIn starts slow', () => {
    const accel = new AcceleratingMovement({
      startSpeed: 0, endSpeed: 100, duration: 1000, easing: MovementEasing.easeIn,
    });
    const entity = makeEntityMock(0, 0);
    accel.entity = entity as any;

    accel.update(500);
    // easeIn at t=0.5 -> 0.25 * range
    expect(accel.getCurrentSpeed()).toBeCloseTo(25, 0);
  });

  it('reset clears elapsed', () => {
    const accel = new AcceleratingMovement({
      startSpeed: 0, endSpeed: 100, duration: 1000, easing: MovementEasing.linear,
    });
    const entity = makeEntityMock(0, 0);
    accel.entity = entity as any;

    accel.update(500);
    accel.reset();
    expect(accel.getCurrentSpeed()).toBe(0);
  });
});
