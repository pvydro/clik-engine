import { describe, it, expect } from 'vitest';
import { Movement } from '../../../src/entity/components/Movement';
import { makeEntityMock } from '../../helpers/TestScene';

function makeMovement(speed = 200, friction = 0) {
  const m = new Movement(speed, friction);
  m.entity = makeEntityMock(0, 0) as never;
  return m;
}

describe('Movement', () => {
  it('stores speed and friction', () => {
    const m = makeMovement(300, 0.5);
    expect(m.speed).toBe(300);
    expect(m.friction).toBe(0.5);
  });

  it('setVelocity stores values', () => {
    const m = makeMovement();
    m.setVelocity(100, -50);
    expect(m.getVelocity()).toEqual({ x: 100, y: -50 });
  });

  it('update moves entity by velocity * dt', () => {
    const m = makeMovement();
    m.setVelocity(200, 0);
    m.update(500); // 0.5 seconds
    expect(m.entity.x).toBeCloseTo(100);
    expect(m.entity.y).toBe(0);
  });

  it('moveInDirection normalises diagonal', () => {
    const m = makeMovement(200);
    m.moveInDirection(1, 1);
    const v = m.getVelocity();
    // Each component should be ~141 (200 / sqrt(2))
    expect(Math.abs(v.x)).toBeCloseTo(200 / Math.sqrt(2), 1);
    expect(Math.abs(v.y)).toBeCloseTo(200 / Math.sqrt(2), 1);
  });

  it('moveInDirection with zero vector stops movement', () => {
    const m = makeMovement();
    m.setVelocity(100, 100);
    m.moveInDirection(0, 0);
    expect(m.getVelocity()).toEqual({ x: 0, y: 0 });
  });

  it('moveToward moves toward target', () => {
    const m = makeMovement(200);
    m.entity.x = 0;
    m.entity.y = 0;
    m.moveToward(100, 0);
    const v = m.getVelocity();
    expect(v.x).toBeCloseTo(200);
    expect(v.y).toBeCloseTo(0);
  });

  it('stop zeroes velocity', () => {
    const m = makeMovement();
    m.setVelocity(100, -100);
    m.stop();
    expect(m.getVelocity()).toEqual({ x: 0, y: 0 });
  });

  it('isMoving returns true with nonzero velocity', () => {
    const m = makeMovement();
    m.setVelocity(1, 0);
    expect(m.isMoving()).toBe(true);
  });

  it('isMoving returns false at rest', () => {
    expect(makeMovement().isMoving()).toBe(false);
  });

  it('friction reduces velocity each frame', () => {
    const m = makeMovement(200, 1.0); // very high friction
    m.setVelocity(200, 0);
    m.update(100); // 0.1 s
    const v = m.getVelocity();
    expect(Math.abs(v.x)).toBeLessThan(200);
  });

  it('friction snaps near-zero velocity to zero', () => {
    // friction=0.99 with dt=1s: 0.05 * (1 - 0.99) = 0.0005, which is < 0.1 threshold
    const m = makeMovement(200, 0.99);
    m.setVelocity(0.05, 0.05);
    m.update(1000); // 1 second
    expect(m.getVelocity().x).toBe(0);
    expect(m.getVelocity().y).toBe(0);
  });
});
