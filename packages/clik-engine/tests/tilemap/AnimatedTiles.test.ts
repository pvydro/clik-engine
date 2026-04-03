import { describe, it, expect } from 'vitest';
import { AnimatedTiles } from '../../src/tilemap/AnimatedTiles';

describe('AnimatedTiles', () => {
  it('registers animated tiles', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43, 44], 100);
    expect(at.animationCount).toBe(1);
    expect(at.getRegistered()).toContain(42);
  });

  it('returns no updates before frame duration', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43, 44], 200);
    const updates = at.update(100);
    expect(updates).toHaveLength(0);
  });

  it('advances frame after duration', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43, 44], 100);
    const updates = at.update(100);
    expect(updates).toHaveLength(1);
    expect(updates[0].baseTile).toBe(42);
    expect(updates[0].currentFrame).toBe(43);
  });

  it('cycles through frames', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43, 44], 100);
    at.update(100); // → 43
    at.update(100); // → 44
    const updates = at.update(100); // → 42 (wraps)
    expect(updates[0].currentFrame).toBe(42);
  });

  it('getCurrentFrame returns current', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43, 44], 100);
    expect(at.getCurrentFrame(42)).toBe(42);
    at.update(100);
    expect(at.getCurrentFrame(42)).toBe(43);
  });

  it('returns null for unregistered tile', () => {
    const at = new AnimatedTiles();
    expect(at.getCurrentFrame(99)).toBeNull();
  });

  it('pause stops updates', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43], 100);
    at.pause();
    expect(at.update(200)).toHaveLength(0);
    expect(at.isPaused).toBe(true);
  });

  it('resume continues updates', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43], 100);
    at.pause();
    at.resume();
    expect(at.update(100)).toHaveLength(1);
  });

  it('reset returns all to first frame', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43, 44], 100);
    at.update(200); // advance 2 frames
    at.reset();
    expect(at.getCurrentFrame(42)).toBe(42);
  });

  it('unregister removes animation', () => {
    const at = new AnimatedTiles();
    at.register(42, [42, 43], 100);
    at.unregister(42);
    expect(at.animationCount).toBe(0);
  });

  it('clear removes all', () => {
    const at = new AnimatedTiles();
    at.register(1, [1, 2], 100);
    at.register(3, [3, 4], 100);
    at.clear();
    expect(at.animationCount).toBe(0);
  });
});
