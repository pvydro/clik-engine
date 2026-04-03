import { describe, it, expect } from 'vitest';
import { VerletChain } from '../../src/physics/VerletChain';

describe('VerletChain', () => {
  it('creates chain with correct number of points', () => {
    const chain = new VerletChain({ points: 5, segmentLength: 10 });
    expect(chain.length).toBe(5);
  });

  it('initializes points in a vertical line', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 20 });
    const points = chain.getPoints();
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[1]).toEqual({ x: 0, y: 20 });
    expect(points[2]).toEqual({ x: 0, y: 40 });
  });

  it('anchor pins a point', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10, gravity: 0 });
    chain.setAnchor(0, 100, 50);

    chain.update(16);
    const p = chain.getPoint(0);
    expect(p!.x).toBe(100);
    expect(p!.y).toBe(50);
  });

  it('gravity pulls points down', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10, gravity: 980 });
    chain.setAnchor(0, 0, 0);

    const before = chain.getPoint(2)!.y;
    chain.update(100); // 100ms step
    const after = chain.getPoint(2)!.y;

    expect(after).toBeGreaterThan(before);
  });

  it('constraints maintain approximate segment length', () => {
    const segLen = 20;
    const chain = new VerletChain({ points: 5, segmentLength: segLen, gravity: 980, stiffness: 5 });
    chain.setAnchor(0, 0, 0);

    // Simulate several frames
    for (let i = 0; i < 60; i++) chain.update(16);

    const points = chain.getPoints();
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Should be approximately the segment length (within 20% tolerance)
      expect(dist).toBeGreaterThan(segLen * 0.8);
      expect(dist).toBeLessThan(segLen * 1.2);
    }
  });

  it('getTail returns last point', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10 });
    expect(chain.getTail()).toEqual({ x: 0, y: 20 });
  });

  it('totalLength returns full extended length', () => {
    const chain = new VerletChain({ points: 5, segmentLength: 15 });
    expect(chain.totalLength).toBe(60); // 4 segments * 15
  });

  it('applyImpulse moves a free point', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10, gravity: 0 });
    const before = chain.getPoint(1)!.x;
    chain.applyImpulse(1, 50, 0);
    expect(chain.getPoint(1)!.x).toBe(before + 50);
  });

  it('applyImpulse does nothing to pinned point', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10, gravity: 0 });
    chain.setAnchor(0, 100, 100);
    chain.applyImpulse(0, 50, 0);
    expect(chain.getPoint(0)!.x).toBe(100);
  });

  it('releaseAnchor unpins a point', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10, gravity: 980 });
    chain.setAnchor(0, 0, 0);
    chain.releaseAnchor(0);

    const before = chain.getPoint(0)!.y;
    chain.update(100);
    // Should have moved (gravity pulls it)
    expect(chain.getPoint(0)!.y).not.toBe(before);
  });

  it('resetChain restores vertical line', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10, gravity: 980 });
    chain.setAnchor(0, 50, 50);
    for (let i = 0; i < 30; i++) chain.update(16);

    chain.resetChain();
    const points = chain.getPoints();
    expect(points[0].x).toBe(50);
    expect(points[1].x).toBe(50);
    expect(points[2].x).toBe(50);
  });

  it('getPoint returns null for out of range', () => {
    const chain = new VerletChain({ points: 3, segmentLength: 10 });
    expect(chain.getPoint(5)).toBeNull();
    expect(chain.getPoint(-1)).toBeNull();
  });
});
