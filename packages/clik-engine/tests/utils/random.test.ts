import { describe, it, expect } from 'vitest';
import { pick, shuffle, weightedRandom, SeededRandom } from '../../src/utils/random';

describe('pick', () => {
  it('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(arr));
    }
  });
});

describe('shuffle', () => {
  it('returns same elements in different order', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const copy = [...arr];
    shuffle(copy);
    expect(copy).toHaveLength(arr.length);
    expect(copy.sort()).toEqual(arr.sort());
  });
});

describe('weightedRandom', () => {
  it('respects weights', () => {
    const items = ['a', 'b'];
    const weights = [100, 0];
    for (let i = 0; i < 50; i++) {
      expect(weightedRandom(items, weights)).toBe('a');
    }
  });
});

describe('SeededRandom', () => {
  it('produces deterministic sequences', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = new SeededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns integers in range', () => {
    const rng = new SeededRandom(456);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRandom(1);
    const rng2 = new SeededRandom(2);
    const seq1 = Array.from({ length: 5 }, () => rng1.next());
    const seq2 = Array.from({ length: 5 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });
});
