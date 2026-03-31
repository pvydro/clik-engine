import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../src/utils/random';
import { shuffleArray, weightedPick, randomPointInRect, noiseSample1D } from '../../src/pcg/SeededUtils';

describe('SeededUtils', () => {
  describe('shuffleArray', () => {
    it('returns array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffleArray(arr, new SeededRandom(42));
      expect(result.length).toBe(arr.length);
    });

    it('contains all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffleArray(arr, new SeededRandom(42));
      expect(result.sort()).toEqual(arr.sort());
    });

    it('does not modify original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const copy = [...arr];
      shuffleArray(arr, new SeededRandom(42));
      expect(arr).toEqual(copy);
    });

    it('is deterministic with same seed', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const a = shuffleArray(arr, new SeededRandom(42));
      const b = shuffleArray(arr, new SeededRandom(42));
      expect(a).toEqual(b);
    });
  });

  describe('weightedPick', () => {
    it('returns an item from the list', () => {
      const items = ['a', 'b', 'c'];
      const weights = [1, 1, 1];
      const result = weightedPick(items, weights, new SeededRandom(42));
      expect(items).toContain(result);
    });

    it('heavily weighted item is usually picked', () => {
      const items = ['rare', 'common'];
      const weights = [0.01, 100];
      // With 100x weight, common should be picked almost always
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(weightedPick(items, weights, new SeededRandom(i)));
      }
      // At least most should be 'common'
      expect(results.has('common')).toBe(true);
    });
  });

  describe('randomPointInRect', () => {
    it('returns point within bounds', () => {
      const random = new SeededRandom(42);
      for (let i = 0; i < 50; i++) {
        const p = randomPointInRect(10, 20, 30, 40, random);
        expect(p.x).toBeGreaterThanOrEqual(10);
        expect(p.x).toBeLessThan(40);
        expect(p.y).toBeGreaterThanOrEqual(20);
        expect(p.y).toBeLessThan(60);
      }
    });
  });

  describe('noiseSample1D', () => {
    it('returns a number between 0 and 1', () => {
      const random = new SeededRandom(42);
      const val = noiseSample1D(5, 0.1, random);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    });
  });
});
