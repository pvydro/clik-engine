import { describe, it, expect } from 'vitest';
import { Grid2D, PriorityQueue } from '../../src/utils/structures';

describe('Grid2D', () => {
  it('creates with default value', () => {
    const grid = new Grid2D(3, 3, 0);
    expect(grid.get(0, 0)).toBe(0);
    expect(grid.get(2, 2)).toBe(0);
  });

  it('sets and gets values', () => {
    const grid = new Grid2D(3, 3, 0);
    grid.set(1, 2, 42);
    expect(grid.get(1, 2)).toBe(42);
  });

  it('returns undefined for out of bounds', () => {
    const grid = new Grid2D(3, 3, 0);
    expect(grid.get(-1, 0)).toBeUndefined();
    expect(grid.get(3, 0)).toBeUndefined();
  });

  it('checks bounds', () => {
    const grid = new Grid2D(4, 5, 0);
    expect(grid.inBounds(0, 0)).toBe(true);
    expect(grid.inBounds(3, 4)).toBe(true);
    expect(grid.inBounds(4, 0)).toBe(false);
    expect(grid.inBounds(0, 5)).toBe(false);
  });

  it('gets neighbors', () => {
    const grid = new Grid2D(3, 3, 0);
    const n = grid.getNeighbors(1, 1);
    expect(n).toHaveLength(4);
  });

  it('gets diagonal neighbors', () => {
    const grid = new Grid2D(3, 3, 0);
    const n = grid.getNeighbors(1, 1, true);
    expect(n).toHaveLength(8);
  });

  it('corner has fewer neighbors', () => {
    const grid = new Grid2D(3, 3, 0);
    expect(grid.getNeighbors(0, 0)).toHaveLength(2);
  });

  it('finds values', () => {
    const grid = new Grid2D(3, 3, 0);
    grid.set(2, 1, 99);
    const found = grid.find((v) => v === 99);
    expect(found).toEqual({ x: 2, y: 1, value: 99 });
  });

  it('clones independently', () => {
    const grid = new Grid2D(2, 2, 0);
    grid.set(0, 0, 5);
    const clone = grid.clone();
    clone.set(0, 0, 10);
    expect(grid.get(0, 0)).toBe(5);
    expect(clone.get(0, 0)).toBe(10);
  });
});

describe('PriorityQueue', () => {
  it('dequeues in priority order', () => {
    const pq = new PriorityQueue<string>();
    pq.enqueue('low', 10);
    pq.enqueue('high', 1);
    pq.enqueue('mid', 5);
    expect(pq.dequeue()).toBe('high');
    expect(pq.dequeue()).toBe('mid');
    expect(pq.dequeue()).toBe('low');
  });

  it('tracks size', () => {
    const pq = new PriorityQueue<number>();
    expect(pq.isEmpty).toBe(true);
    pq.enqueue(1, 1);
    pq.enqueue(2, 2);
    expect(pq.size).toBe(2);
    pq.dequeue();
    expect(pq.size).toBe(1);
  });

  it('peeks without removing', () => {
    const pq = new PriorityQueue<string>();
    pq.enqueue('a', 5);
    pq.enqueue('b', 1);
    expect(pq.peek()).toBe('b');
    expect(pq.size).toBe(2);
  });

  it('returns undefined when empty', () => {
    const pq = new PriorityQueue<number>();
    expect(pq.dequeue()).toBeUndefined();
    expect(pq.peek()).toBeUndefined();
  });
});
