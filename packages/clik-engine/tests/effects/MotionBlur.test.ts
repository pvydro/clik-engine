import { describe, it, expect } from 'vitest';
import { MotionBlur } from '../../src/effects/MotionBlur';

describe('MotionBlur', () => {
  describe('direction', () => {
    it('computes angle from velocity', () => {
      const result = MotionBlur.direction(100, 0);
      expect(result.angle).toBeCloseTo(0); // rightward
      expect(result.strength).toBe(100);
    });

    it('computes downward angle', () => {
      const result = MotionBlur.direction(0, 100);
      expect(result.angle).toBeCloseTo(Math.PI / 2);
    });

    it('computes diagonal angle', () => {
      const result = MotionBlur.direction(100, 100);
      expect(result.angle).toBeCloseTo(Math.PI / 4);
      expect(result.strength).toBeCloseTo(141.42, 1);
    });

    it('returns zero strength for zero velocity', () => {
      const result = MotionBlur.direction(0, 0);
      expect(result.strength).toBe(0);
    });
  });
});
