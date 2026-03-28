import { describe, it, expect } from 'vitest';
import { clamp, lerp, randomRange, randomInt } from '../../src/utils/math';

describe('clamp', () => {
  it('clamps values below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps values above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('extrapolates beyond 0-1', () => {
    expect(lerp(10, 20, 2)).toBe(30);
  });
});

describe('randomRange', () => {
  it('returns values within range', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomRange(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });
});

describe('randomInt', () => {
  it('returns integers within range', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
