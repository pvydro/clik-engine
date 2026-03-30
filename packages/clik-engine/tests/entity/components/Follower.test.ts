import { describe, it, expect } from 'vitest';
import { Follower } from '../../../src/entity/components/Follower';
import { makeEntityMock } from '../../helpers/TestScene';

function makeFollower(speed = 100, stopDist = 5, mode: 'chase' | 'flee' = 'chase') {
  const f = new Follower(speed, stopDist, mode);
  f.entity = makeEntityMock(0, 0) as never;
  return f;
}

describe('Follower', () => {
  it('hasTarget returns false initially', () => {
    expect(makeFollower().hasTarget()).toBe(false);
  });

  it('setTarget returns this', () => {
    const f = makeFollower();
    expect(f.setTarget({ x: 100, y: 0 })).toBe(f);
  });

  it('hasTarget returns true after setTarget', () => {
    const f = makeFollower();
    f.setTarget({ x: 100, y: 0 });
    expect(f.hasTarget()).toBe(true);
  });

  it('chase mode moves entity toward target', () => {
    const f = makeFollower(200);
    f.setTarget({ x: 100, y: 0 });
    f.update(500); // 0.5s × 200px/s = 100px — should arrive
    expect(f.entity.x).toBeGreaterThan(0);
  });

  it('chase mode stops within stopDistance', () => {
    const f = makeFollower(200, 20);
    f.setTarget({ x: 10, y: 0 }); // target is within 20px
    const xBefore = f.entity.x;
    f.update(500);
    expect(f.entity.x).toBe(xBefore); // should not move
  });

  it('flee mode moves entity away from target', () => {
    const f = makeFollower(200, 5, 'flee');
    f.setTarget({ x: 50, y: 0 }); // target to the right
    f.update(200);
    expect(f.entity.x).toBeLessThan(0); // should move left (away)
  });

  it('does nothing when target is null', () => {
    const f = makeFollower();
    f.update(1000);
    expect(f.entity.x).toBe(0);
    expect(f.entity.y).toBe(0);
  });

  it('setSpeed returns this', () => {
    const f = makeFollower();
    expect(f.setSpeed(300)).toBe(f);
  });

  it('setMode returns this', () => {
    const f = makeFollower();
    expect(f.setMode('flee')).toBe(f);
  });

  it('getDistanceToTarget returns Infinity with no target', () => {
    expect(makeFollower().getDistanceToTarget()).toBe(Infinity);
  });

  it('getDistanceToTarget returns correct distance', () => {
    const f = makeFollower();
    f.setTarget({ x: 3, y: 4 }); // 3-4-5 triangle
    expect(f.getDistanceToTarget()).toBe(5);
  });

  it('setTarget(null) clears target', () => {
    const f = makeFollower();
    f.setTarget({ x: 100, y: 0 });
    f.setTarget(null);
    expect(f.hasTarget()).toBe(false);
  });

  it('flee mode does nothing when target coincides (dist=0)', () => {
    const f = makeFollower(200, 5, 'flee');
    f.setTarget({ x: 0, y: 0 }); // same position
    const xBefore = f.entity.x;
    f.update(500);
    expect(f.entity.x).toBe(xBefore);
  });
});
