import { describe, it, expect } from 'vitest';
import { Patrol } from '../../../src/entity/components/Patrol';
import { makeEntityMock } from '../../helpers/TestScene';

const POINTS = [
  { x: 0,   y: 0 },
  { x: 100, y: 0 },
  { x: 200, y: 0 },
];

function makePatrol(points = POINTS, speed = 100, loop = true) {
  const p = new Patrol(points, speed, loop);
  p.entity = makeEntityMock(0, 0) as never;
  p.onAttach();
  return p;
}

/**
 * Patrol starts the entity at points[0] (index 0).
 * The first update() "arrives" at points[0] immediately (dist=0) and advances
 * currentIndex to 1.  Movement actually begins on the second update() call.
 */
describe('Patrol', () => {
  it('onAttach positions entity at first point', () => {
    const p = makePatrol([{ x: 50, y: 75 }, { x: 150, y: 75 }]);
    expect(p.entity.x).toBe(50);
    expect(p.entity.y).toBe(75);
  });

  it('does nothing with fewer than 2 points', () => {
    const p = new Patrol([{ x: 0, y: 0 }], 100);
    p.entity = makeEntityMock(0, 0) as never;
    p.onAttach();
    p.update(1000);
    expect(p.entity.x).toBe(0);
  });

  it('advances past first point on first update, then moves', () => {
    const p = makePatrol(); // entity at (0,0), currentIndex=0
    p.update(100); // dist=0 → arrive, advance index to 1; entity stays at 0
    p.update(100); // move toward points[1] (x=100); step=10px
    expect(p.entity.x).toBeGreaterThan(0);
  });

  it('reaches second point and advances index again', () => {
    const p = makePatrol(POINTS, 100);
    p.update(100); // advance to index 1
    // travel enough to reach x=100 (1000ms at 100px/s)
    p.update(1000);
    // should be at or past points[1]
    expect(p.entity.x).toBeGreaterThanOrEqual(100);
  });

  it('reverses direction when last point is reached (loop=true)', () => {
    // Use a short patrol so we can exhaust it quickly
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const p = makePatrol(pts, 1000, true);
    // First update: arrive at pts[0], advance to index 1
    p.update(100);
    // Second update: step=100 > dist=10 → arrive at pts[1], loop → forward=false, index=0
    p.update(100);
    expect(p.entity.x).toBe(10); // at pts[1]
    // Third update: moving back toward pts[0]; step=100 > dist=10 → arrive at 0
    p.update(100);
    expect(p.entity.x).toBe(0); // back at start
  });

  it('getCurrentIndex advances to 1 after first update', () => {
    const p = makePatrol();
    p.update(1); // arrive at points[0] (dist=0), advance to index 1
    expect(p.getCurrentIndex()).toBe(1);
  });

  it('reverse() causes backward traversal at the next waypoint', () => {
    // 3-point patrol, very high speed so we arrive instantly
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
    const p = new Patrol(pts, 1000, true);
    p.entity = makeEntityMock(0, 0) as never;
    p.onAttach();
    p.update(100); // arrive at pts[0] (dist=0), advance to index 1; entity stays at 0
    p.reverse();   // flip: forward → false
    // Now heading toward pts[1] but with forward=false, will go backward on arrival
    p.update(100); // step=100 > dist(10) → arrive at pts[1] (x=10); forward=false → index 1→0
    expect(p.entity.x).toBe(10);
    p.update(100); // arrive at pts[0] (x=0), index goes below 0 → reset forward=true, index=1
    expect(p.entity.x).toBe(0);
  });

  it('setSpeed() affects movement amount per frame', () => {
    const p = makePatrol(POINTS, 100);
    p.setSpeed(200);
    p.update(100); // advance index 0→1, entity stays at 0
    p.update(100); // move 200*0.1=20px
    expect(p.entity.x).toBeCloseTo(20, 0);
  });

  it('waits at a point with waitMs', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0, waitMs: 500 }, { x: 20, y: 0 }];
    const p = new Patrol(pts, 1000, true);
    p.entity = makeEntityMock(0, 0) as never;
    p.onAttach();
    p.update(100); // arrive at pts[0], advance to index 1
    p.update(100); // step=100 > 10 → arrive at pts[1] (x=10), start waiting 500ms
    const xAtWait = p.entity.x; // should be 10
    expect(xAtWait).toBe(10);
    p.update(100); // still waiting (300ms remaining)
    expect(p.entity.x).toBe(xAtWait); // has not moved
  });
});
