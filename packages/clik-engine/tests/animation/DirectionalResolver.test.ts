import { describe, it, expect } from 'vitest';
import { DirectionalResolver } from '../../src/animation/DirectionalResolver';

describe('DirectionalResolver', () => {
  describe('8-way', () => {
    const resolver = new DirectionalResolver('8-way');

    it('resolves east', () => {
      const result = resolver.resolve('walk', 1, 0);
      expect(result.animKey).toBe('walk_e');
      expect(result.flipX).toBe(false);
    });

    it('resolves north', () => {
      const result = resolver.resolve('walk', 0, -1);
      expect(result.animKey).toBe('walk_n');
    });

    it('resolves south', () => {
      const result = resolver.resolve('walk', 0, 1);
      expect(result.animKey).toBe('walk_s');
    });

    it('resolves west', () => {
      const result = resolver.resolve('walk', -1, 0);
      expect(result.animKey).toBe('walk_w');
    });

    it('resolves northeast', () => {
      const result = resolver.resolve('walk', 1, -1);
      expect(result.animKey).toBe('walk_ne');
    });

    it('returns base name for zero vector', () => {
      const result = resolver.resolve('idle', 0, 0);
      expect(result.animKey).toBe('idle');
      expect(result.flipX).toBe(false);
    });
  });

  describe('4-way', () => {
    const resolver = new DirectionalResolver('4-way');

    it('resolves to cardinal directions only', () => {
      expect(resolver.resolve('walk', 1, 0).animKey).toBe('walk_e');
      expect(resolver.resolve('walk', 0, -1).animKey).toBe('walk_n');
      expect(resolver.resolve('walk', 0, 1).animKey).toBe('walk_s');
      expect(resolver.resolve('walk', -1, 0).animKey).toBe('walk_w');
    });

    it('diagonal snaps to nearest cardinal', () => {
      const result = resolver.resolve('walk', 1, -1);
      // 45 degrees should snap to n or e
      expect(['walk_n', 'walk_e']).toContain(result.animKey);
    });
  });

  describe('with availability check', () => {
    const resolver = new DirectionalResolver('8-way');
    resolver.setAvailable(['walk_n', 'walk_s', 'walk_e']);

    it('returns exact match when available', () => {
      expect(resolver.resolve('walk', 0, -1).animKey).toBe('walk_n');
    });

    it('falls back to mirror with flipX when direction not available', () => {
      // walk_w not available, should mirror to walk_e with flipX
      const result = resolver.resolve('walk', -1, 0);
      expect(result.animKey).toBe('walk_e');
      expect(result.flipX).toBe(true);
    });

    it('falls back to base name as last resort', () => {
      const sparse = new DirectionalResolver('8-way');
      sparse.setAvailable(['walk']); // only base name
      const result = sparse.resolve('walk', 1, -1);
      expect(result.animKey).toBe('walk');
    });
  });

  describe('vectorToDirection', () => {
    const resolver = new DirectionalResolver('8-way');

    it('converts vector to direction string', () => {
      expect(resolver.vectorToDirection(1, 0)).toBe('e');
      expect(resolver.vectorToDirection(0, -1)).toBe('n');
      expect(resolver.vectorToDirection(-1, 0)).toBe('w');
      expect(resolver.vectorToDirection(0, 1)).toBe('s');
    });
  });

  it('getMode returns the mode', () => {
    expect(new DirectionalResolver('4-way').getMode()).toBe('4-way');
    expect(new DirectionalResolver('8-way').getMode()).toBe('8-way');
  });
});
