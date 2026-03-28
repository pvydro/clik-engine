import { describe, it, expect } from 'vitest';
import { Vector2 } from '../../src/utils/vector';

describe('Vector2', () => {
  it('creates a vector', () => {
    const v = Vector2.create(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('adds vectors', () => {
    const result = Vector2.add({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(result).toEqual({ x: 4, y: 6 });
  });

  it('subtracts vectors', () => {
    const result = Vector2.sub({ x: 5, y: 8 }, { x: 3, y: 4 });
    expect(result).toEqual({ x: 2, y: 4 });
  });

  it('scales a vector', () => {
    const result = Vector2.scale({ x: 3, y: 4 }, 2);
    expect(result).toEqual({ x: 6, y: 8 });
  });

  it('calculates length', () => {
    expect(Vector2.length({ x: 3, y: 4 })).toBe(5);
  });

  it('normalizes a vector', () => {
    const n = Vector2.normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });

  it('normalizes zero vector safely', () => {
    const n = Vector2.normalize({ x: 0, y: 0 });
    expect(n).toEqual({ x: 0, y: 0 });
  });

  it('calculates distance', () => {
    expect(Vector2.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('calculates dot product', () => {
    expect(Vector2.dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0); // perpendicular
    expect(Vector2.dot({ x: 1, y: 0 }, { x: 1, y: 0 })).toBe(1); // parallel
  });

  it('calculates angle', () => {
    expect(Vector2.angle({ x: 1, y: 0 })).toBeCloseTo(0);
    expect(Vector2.angle({ x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
  });

  it('rotates a vector', () => {
    const v = Vector2.rotate({ x: 1, y: 0 }, Math.PI / 2);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });

  it('lerps between vectors', () => {
    const result = Vector2.lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5);
    expect(result).toEqual({ x: 5, y: 10 });
  });

  it('creates from angle', () => {
    const v = Vector2.fromAngle(0, 5);
    expect(v.x).toBeCloseTo(5);
    expect(v.y).toBeCloseTo(0);
  });

  it('checks equality with epsilon', () => {
    expect(Vector2.equals({ x: 1, y: 2 }, { x: 1.0001, y: 2.0001 })).toBe(true);
    expect(Vector2.equals({ x: 1, y: 2 }, { x: 1.1, y: 2 })).toBe(false);
  });
});
