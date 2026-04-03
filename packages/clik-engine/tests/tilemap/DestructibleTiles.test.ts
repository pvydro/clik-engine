import { describe, it, expect, vi } from 'vitest';
import { DestructibleTiles } from '../../src/tilemap/DestructibleTiles';

describe('DestructibleTiles', () => {
  it('registers and tracks tiles', () => {
    const dt = new DestructibleTiles({ maxHealth: 100 });
    dt.registerTile(5, 3);
    expect(dt.isDestructible(5, 3)).toBe(true);
    expect(dt.isDestructible(0, 0)).toBe(false);
    expect(dt.tileCount).toBe(1);
  });

  it('damage reduces health', () => {
    const dt = new DestructibleTiles({ maxHealth: 100 });
    dt.registerTile(5, 3);
    dt.damage(5, 3, 40);
    expect(dt.getHealth(5, 3)!.current).toBe(60);
  });

  it('damage triggers stages', () => {
    const dt = new DestructibleTiles({ maxHealth: 100 });
    dt.setStages([{ threshold: 0.5, tileIndex: 42 }]);
    dt.registerTile(5, 3);

    const r1 = dt.damage(5, 3, 30); // 70% → above 50%
    expect(r1.newTileIndex).toBeNull();

    const r2 = dt.damage(5, 3, 30); // 40% → below 50%
    expect(r2.newTileIndex).toBe(42);
  });

  it('destroys tile at zero health', () => {
    const cb = vi.fn();
    const dt = new DestructibleTiles({ maxHealth: 50, destroyedTileIndex: 0 });
    dt.onDestroy(cb);
    dt.registerTile(5, 3);

    const result = dt.damage(5, 3, 50);
    expect(result.destroyed).toBe(true);
    expect(result.newTileIndex).toBe(0);
    expect(cb).toHaveBeenCalledWith(5, 3);
    expect(dt.isDestructible(5, 3)).toBe(false);
  });

  it('onDamage callback fires', () => {
    const cb = vi.fn();
    const dt = new DestructibleTiles({ maxHealth: 100 });
    dt.onDamage(cb);
    dt.registerTile(1, 1);
    dt.damage(1, 1, 25);
    expect(cb).toHaveBeenCalledWith(1, 1, 75);
  });

  it('damage on unregistered tile returns no-op', () => {
    const dt = new DestructibleTiles();
    const result = dt.damage(0, 0, 10);
    expect(result.destroyed).toBe(false);
    expect(result.newTileIndex).toBeNull();
  });

  it('repair increases health', () => {
    const dt = new DestructibleTiles({ maxHealth: 100 });
    dt.registerTile(1, 1);
    dt.damage(1, 1, 40);
    dt.repair(1, 1, 20);
    expect(dt.getHealth(1, 1)!.current).toBe(80);
  });

  it('repair caps at max', () => {
    const dt = new DestructibleTiles({ maxHealth: 100 });
    dt.registerTile(1, 1);
    dt.damage(1, 1, 10);
    dt.repair(1, 1, 50);
    expect(dt.getHealth(1, 1)!.current).toBe(100);
  });

  it('getHealth returns null for unregistered', () => {
    const dt = new DestructibleTiles();
    expect(dt.getHealth(0, 0)).toBeNull();
  });

  it('clear removes all tiles', () => {
    const dt = new DestructibleTiles();
    dt.registerTile(1, 1);
    dt.registerTile(2, 2);
    dt.clear();
    expect(dt.tileCount).toBe(0);
  });
});
