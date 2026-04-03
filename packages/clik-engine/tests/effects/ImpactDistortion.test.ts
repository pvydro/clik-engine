import { describe, it, expect } from 'vitest';
import { ImpactDistortion } from '../../src/effects/ImpactDistortion';

describe('ImpactDistortion', () => {
  it('falloff returns zero at max radius', () => {
    expect(ImpactDistortion.falloff(100, 100, 1)).toBe(0);
  });

  it('falloff returns full intensity at center', () => {
    expect(ImpactDistortion.falloff(0, 100, 1)).toBe(1);
  });

  it('falloff returns partial at halfway', () => {
    const v = ImpactDistortion.falloff(50, 100, 1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  it('falloff scales with intensity', () => {
    expect(ImpactDistortion.falloff(0, 100, 0.5)).toBe(0.5);
  });

  it('falloff returns zero beyond radius', () => {
    expect(ImpactDistortion.falloff(150, 100, 1)).toBe(0);
  });
});
