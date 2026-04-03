import { describe, it, expect, vi } from 'vitest';
import { CollisionRebuilder } from '../../src/tilemap/CollisionRebuilder';

describe('CollisionRebuilder', () => {
  it('starts with no dirty tiles', () => {
    const r = new CollisionRebuilder();
    expect(r.hasDirty).toBe(false);
    expect(r.dirtyCount).toBe(0);
  });

  it('markDirty tracks tiles', () => {
    const r = new CollisionRebuilder();
    r.markDirty(5, 3);
    expect(r.hasDirty).toBe(true);
    expect(r.dirtyCount).toBe(1);
    expect(r.isDirty(5, 3)).toBe(true);
  });

  it('flush returns and clears dirty tiles', () => {
    const r = new CollisionRebuilder();
    r.markDirty(1, 1);
    r.markDirty(2, 2);
    const tiles = r.flush();
    expect(tiles).toHaveLength(2);
    expect(r.hasDirty).toBe(false);
  });

  it('deduplicates same tile', () => {
    const r = new CollisionRebuilder();
    r.markDirty(5, 3);
    r.markDirty(5, 3);
    expect(r.dirtyCount).toBe(1);
  });

  it('markRegionDirty marks rectangular area', () => {
    const r = new CollisionRebuilder();
    r.markRegionDirty(0, 0, 3, 2);
    expect(r.dirtyCount).toBe(6);
    expect(r.isDirty(0, 0)).toBe(true);
    expect(r.isDirty(2, 1)).toBe(true);
  });

  it('onFlush callback fires on flushAndRebuild', () => {
    const cb = vi.fn();
    const r = new CollisionRebuilder();
    r.onFlush(cb);
    r.markDirty(1, 1);
    r.flushAndRebuild();
    expect(cb).toHaveBeenCalledWith([{ x: 1, y: 1 }]);
  });

  it('flushAndRebuild does nothing when clean', () => {
    const cb = vi.fn();
    const r = new CollisionRebuilder();
    r.onFlush(cb);
    r.flushAndRebuild();
    expect(cb).not.toHaveBeenCalled();
  });

  it('clear removes all dirty without processing', () => {
    const r = new CollisionRebuilder();
    r.markDirty(1, 1);
    r.clear();
    expect(r.hasDirty).toBe(false);
  });
});
