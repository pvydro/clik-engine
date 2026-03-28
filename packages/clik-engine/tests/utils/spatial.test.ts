import { describe, it, expect } from 'vitest';
import { SpatialHash } from '../../src/utils/spatial';

describe('SpatialHash', () => {
  it('inserts and queries objects', () => {
    const hash = new SpatialHash<string>(64);
    hash.insert('a', 10, 10);
    hash.insert('b', 20, 20);
    hash.insert('c', 200, 200);

    const near = hash.queryNear(15, 15);
    expect(near.has('a')).toBe(true);
    expect(near.has('b')).toBe(true);
    expect(near.has('c')).toBe(false);
  });

  it('removes objects', () => {
    const hash = new SpatialHash<string>(64);
    hash.insert('a', 10, 10);
    expect(hash.size).toBe(1);
    hash.remove('a');
    expect(hash.size).toBe(0);
    expect(hash.queryNear(10, 10).size).toBe(0);
  });

  it('updates position on re-insert', () => {
    const hash = new SpatialHash<string>(64);
    hash.insert('a', 10, 10);
    hash.insert('a', 500, 500); // Move far away

    expect(hash.queryNear(10, 10).has('a')).toBe(false);
    expect(hash.queryNear(500, 500).has('a')).toBe(true);
    expect(hash.size).toBe(1);
  });

  it('queries rectangular regions', () => {
    const hash = new SpatialHash<string>(32);
    hash.insert('a', 50, 50);
    hash.insert('b', 100, 100);
    hash.insert('c', 300, 300);

    const results = hash.queryRect(0, 0, 150, 150);
    expect(results.has('a')).toBe(true);
    expect(results.has('b')).toBe(true);
    expect(results.has('c')).toBe(false);
  });

  it('handles objects spanning multiple cells', () => {
    const hash = new SpatialHash<string>(32);
    hash.insert('big', 30, 30, 100, 100); // Spans several cells

    // Should be found near any part of the object
    expect(hash.queryNear(30, 30).has('big')).toBe(true);
    expect(hash.queryNear(100, 100).has('big')).toBe(true);
  });

  it('clears all objects', () => {
    const hash = new SpatialHash<string>(64);
    hash.insert('a', 0, 0);
    hash.insert('b', 100, 100);
    hash.clear();
    expect(hash.size).toBe(0);
    expect(hash.cellCount).toBe(0);
  });
});
