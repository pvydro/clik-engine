import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollisionEventTracker } from '../../src/physics/PhysicsEvents';

function makeEntity(x: number, y: number) {
  return { x, y, entityType: 'test', active: true } as any;
}

describe('CollisionEventTracker', () => {
  let tracker: CollisionEventTracker;

  beforeEach(() => {
    tracker = new CollisionEventTracker();
  });

  it('fires enter on first collision frame', () => {
    const cb = vi.fn();
    tracker.onCollision(cb);

    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ entityA: a, entityB: b }), 'enter');
  });

  it('fires stay on subsequent frames', () => {
    const cb = vi.fn();
    tracker.onCollision(cb);

    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    cb.mockClear();
    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    expect(cb).toHaveBeenCalledWith(expect.anything(), 'stay');
  });

  it('fires exit when collision stops', () => {
    const cb = vi.fn();
    tracker.onCollision(cb);

    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    cb.mockClear();
    tracker.beginFrame();
    // No collision reported
    tracker.endFrame();

    expect(cb).toHaveBeenCalledWith(expect.anything(), 'exit');
  });

  it('areColliding returns true for active pairs', () => {
    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    expect(tracker.areColliding(a, b)).toBe(true);
    expect(tracker.areColliding(b, a)).toBe(true); // order-independent
  });

  it('getActivePairs returns current collisions', () => {
    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    expect(tracker.getActivePairs()).toHaveLength(1);
  });

  it('clear removes all tracking', () => {
    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b);
    tracker.endFrame();

    tracker.clear();
    expect(tracker.getActivePairs()).toHaveLength(0);
  });

  it('handles overlap values', () => {
    const cb = vi.fn();
    tracker.onCollision(cb);

    const a = makeEntity(10, 10);
    const b = makeEntity(20, 20);

    tracker.beginFrame();
    tracker.reportCollision(a, b, 5, 3);
    tracker.endFrame();

    expect(cb.mock.calls[0][0].overlapX).toBe(5);
    expect(cb.mock.calls[0][0].overlapY).toBe(3);
  });
});
