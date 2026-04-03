import { describe, it, expect } from 'vitest';
import { BlendTree1D, BlendTree2D } from '../../src/animation/BlendTree';

describe('BlendTree1D', () => {
  const tree = new BlendTree1D([
    { animKey: 'idle', threshold: 0 },
    { animKey: 'walk', threshold: 0.5 },
    { animKey: 'run', threshold: 1 },
  ]);

  it('returns single animation at exact threshold', () => {
    const result = tree.evaluate(0);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ animKey: 'idle', weight: 1 });
  });

  it('returns single animation at end threshold', () => {
    const result = tree.evaluate(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ animKey: 'run', weight: 1 });
  });

  it('blends between two animations at midpoint', () => {
    const result = tree.evaluate(0.25);
    expect(result).toHaveLength(2);
    expect(result[0].animKey).toBe('idle');
    expect(result[1].animKey).toBe('walk');
    expect(result[0].weight).toBeCloseTo(0.5, 1);
    expect(result[1].weight).toBeCloseTo(0.5, 1);
  });

  it('clamps below minimum', () => {
    const result = tree.evaluate(-1);
    expect(result).toHaveLength(1);
    expect(result[0].animKey).toBe('idle');
  });

  it('clamps above maximum', () => {
    const result = tree.evaluate(2);
    expect(result).toHaveLength(1);
    expect(result[0].animKey).toBe('run');
  });

  it('getDominant returns highest weight animation', () => {
    expect(tree.getDominant(0)).toBe('idle');
    expect(tree.getDominant(0.3)).toBe('walk'); // 0.3 is closer to 0.5 than 0
    expect(tree.getDominant(1)).toBe('run');
  });

  it('handles single entry', () => {
    const single = new BlendTree1D([{ animKey: 'only', threshold: 0 }]);
    expect(single.evaluate(5)).toEqual([{ animKey: 'only', weight: 1 }]);
  });

  it('handles empty entries', () => {
    const empty = new BlendTree1D([]);
    expect(empty.evaluate(0)).toEqual([]);
  });

  it('getEntries returns sorted entries', () => {
    expect(tree.getEntries()).toHaveLength(3);
    expect(tree.getEntries()[0].threshold).toBe(0);
  });
});

describe('BlendTree2D', () => {
  const tree = new BlendTree2D([
    { animKey: 'idle', x: 0, y: 0 },
    { animKey: 'walk_n', x: 0, y: -1 },
    { animKey: 'walk_e', x: 1, y: 0 },
    { animKey: 'walk_s', x: 0, y: 1 },
    { animKey: 'walk_w', x: -1, y: 0 },
  ]);

  it('returns exact match when on an entry point', () => {
    const result = tree.evaluate(0, -1);
    expect(result).toHaveLength(1);
    expect(result[0].animKey).toBe('walk_n');
    expect(result[0].weight).toBe(1);
  });

  it('returns idle at origin', () => {
    const result = tree.evaluate(0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].animKey).toBe('idle');
  });

  it('blends between nearby entries', () => {
    const result = tree.evaluate(0.5, -0.5);
    expect(result.length).toBeGreaterThan(1);
    const keys = result.map(r => r.animKey);
    // Should include walk_n and walk_e as dominant
    expect(keys).toContain('walk_n');
    expect(keys).toContain('walk_e');
  });

  it('weights sum to approximately 1', () => {
    const result = tree.evaluate(0.3, 0.7);
    const sum = result.reduce((s, r) => s + r.weight, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('getDominant returns closest animation', () => {
    expect(tree.getDominant(0, -1)).toBe('walk_n');
    expect(tree.getDominant(1, 0)).toBe('walk_e');
    expect(tree.getDominant(0, 0)).toBe('idle');
  });

  it('handles single entry', () => {
    const single = new BlendTree2D([{ animKey: 'only', x: 0, y: 0 }]);
    expect(single.evaluate(5, 5)).toEqual([{ animKey: 'only', weight: 1 }]);
  });

  it('handles empty', () => {
    const empty = new BlendTree2D([]);
    expect(empty.evaluate(0, 0)).toEqual([]);
  });
});
