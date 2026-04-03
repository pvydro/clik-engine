import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { HomingMovement } from '../../../src/entity/components/HomingMovement';
import { makeEntityMock } from '../../helpers/TestScene';

describe('HomingMovement', () => {
  it('moves forward at the current angle', () => {
    const entity = makeEntityMock(0, 0);
    const homing = new HomingMovement(100, Math.PI);
    homing.entity = entity as any;
    homing.setAngle(0); // pointing right

    homing.update(1000); // 1 second
    expect(entity.x).toBeCloseTo(100, 0);
    expect(entity.y).toBeCloseTo(0, 0);
  });

  it('turns toward target', () => {
    const entity = makeEntityMock(0, 0);
    const homing = new HomingMovement(100, Math.PI * 4); // fast turn
    homing.entity = entity as any;
    homing.setAngle(0); // pointing right
    homing.setTarget({ x: 0, y: 100 }); // target is below

    homing.update(500);
    // Should have turned downward
    expect(entity.y).toBeGreaterThan(0);
  });

  it('respects turn rate limit', () => {
    const entity = makeEntityMock(0, 0);
    const homing = new HomingMovement(100, 0.1); // very slow turn
    homing.entity = entity as any;
    homing.setAngle(0);
    homing.setTarget({ x: 0, y: 100 }); // 90 degrees away

    homing.update(100);
    // Should barely have turned
    const angle = homing.getAngle();
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(Math.PI / 4);
  });

  it('moves without target (straight line)', () => {
    const entity = makeEntityMock(0, 0);
    const homing = new HomingMovement(200);
    homing.entity = entity as any;
    homing.setAngle(Math.PI / 2); // pointing down

    homing.update(500);
    expect(entity.x).toBeCloseTo(0, 0);
    expect(entity.y).toBeCloseTo(100, 0);
  });

  it('reset clears angle and target', () => {
    const entity = makeEntityMock(0, 0);
    const homing = new HomingMovement();
    homing.entity = entity as any;
    homing.setAngle(1.5);
    homing.setTarget({ x: 100, y: 100 });

    homing.reset();
    expect(homing.getAngle()).toBe(0);
  });
});
