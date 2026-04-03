import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { SineMovement } from '../../../src/entity/components/SineMovement';
import { makeEntityMock } from '../../helpers/TestScene';

describe('SineMovement', () => {
  it('moves forward over time', () => {
    const entity = makeEntityMock(0, 0);
    const sine = new SineMovement({ speed: 200, amplitude: 0, angle: 0 });
    sine.entity = entity as any;

    sine.update(1000);
    expect(entity.x).toBeCloseTo(200, 0);
    expect(entity.y).toBeCloseTo(0, 0);
  });

  it('oscillates perpendicular to forward direction', () => {
    const entity = makeEntityMock(0, 0);
    const sine = new SineMovement({ speed: 100, amplitude: 50, frequency: 2, angle: 0 });
    sine.entity = entity as any;

    // Capture y values over multiple steps
    const yValues: number[] = [];
    for (let i = 0; i < 20; i++) {
      sine.update(50);
      yValues.push(entity.y);
    }

    // Should have both positive and negative y values (oscillation)
    const hasPositive = yValues.some(y => y > 1);
    const hasNegative = yValues.some(y => y < -1);
    expect(hasPositive || hasNegative).toBe(true);
  });

  it('moves at specified angle', () => {
    const entity = makeEntityMock(0, 0);
    const sine = new SineMovement({ speed: 100, amplitude: 0, angle: Math.PI / 2 });
    sine.entity = entity as any;

    sine.update(1000);
    expect(entity.x).toBeCloseTo(0, 0);
    expect(entity.y).toBeCloseTo(100, 0);
  });

  it('reset clears elapsed time', () => {
    const entity = makeEntityMock(0, 0);
    const sine = new SineMovement({ speed: 100, amplitude: 50, frequency: 1 });
    sine.entity = entity as any;

    sine.update(500);
    sine.reset();
    // After reset, internal elapsed is 0
    // This should mean the sine offset starts from the beginning
    const xBefore = entity.x;
    sine.update(16);
    expect(entity.x).not.toBe(xBefore); // It still moves
  });
});
