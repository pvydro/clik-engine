import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

function makeEntity(type = 'test', tags: string[] = []) {
  const storedTags = new Set(tags);
  const storedComponents = new Set<string>();
  let registry: {
    onTagAdded: (e: unknown, t: string) => void;
    onTagRemoved: (e: unknown, t: string) => void;
    onComponentAdded: (e: unknown, n: string) => void;
    onComponentRemoved: (e: unknown, n: string) => void;
  } | null = null;

  const entity = {
    entityType: type,
    active: true,
    x: 0,
    y: 0,
    getTags: () => Array.from(storedTags),
    getComponentNames: () => Array.from(storedComponents),
    setRegistry: (r: typeof registry) => { registry = r; },
    addTag: (tag: string) => {
      if (!storedTags.has(tag)) {
        storedTags.add(tag);
        registry?.onTagAdded(entity, tag);
      }
      return entity;
    },
    removeTag: (tag: string) => {
      if (storedTags.delete(tag)) {
        registry?.onTagRemoved(entity, tag);
      }
      return entity;
    },
    hasTag: (tag: string) => storedTags.has(tag),
    addComponent: (name: string) => {
      storedComponents.add(name);
      registry?.onComponentAdded(entity, name);
    },
    removeComponent: (name: string) => {
      storedComponents.delete(name);
      registry?.onComponentRemoved(entity, name);
    },
    updateComponents: vi.fn(),
    destroy: vi.fn().mockImplementation(() => { entity.active = false; }),
  };
  return entity;
}

import { EntityRegistry } from '../../src/entity/EntityRegistry';

describe('EntityRegistry — Spatial', () => {
  it('enableSpatial returns this for chaining', () => {
    const reg = new EntityRegistry();
    expect(reg.enableSpatial()).toBe(reg);
    expect(reg.isSpatialEnabled).toBe(true);
  });

  it('getNearby returns empty when spatial not enabled', () => {
    const reg = new EntityRegistry();
    expect(reg.getNearby(0, 0, 100)).toEqual([]);
  });

  it('getInRect returns empty when spatial not enabled', () => {
    const reg = new EntityRegistry();
    expect(reg.getInRect(0, 0, 100, 100)).toEqual([]);
  });

  it('getNearby finds entities within radius after updateAll', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100 });

    const e1 = makeEntity('enemy', ['spatial']);
    e1.x = 50;
    e1.y = 50;
    reg.register(e1 as never);

    const e2 = makeEntity('enemy', ['spatial']);
    e2.x = 500;
    e2.y = 500;
    reg.register(e2 as never);

    // Need to call updateAll to refresh spatial positions
    reg.updateAll(16);

    const nearby = reg.getNearby(60, 60, 50);
    expect(nearby).toContain(e1);
    expect(nearby).not.toContain(e2);
  });

  it('getNearby excludes entities outside radius', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 50 });

    const e1 = makeEntity('test', ['spatial']);
    e1.x = 0;
    e1.y = 0;
    reg.register(e1 as never);

    reg.updateAll(16);

    const nearby = reg.getNearby(200, 200, 10);
    expect(nearby).not.toContain(e1);
  });

  it('only tracks entities with spatial tag', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100 });

    const tracked = makeEntity('enemy', ['spatial']);
    tracked.x = 10;
    tracked.y = 10;
    reg.register(tracked as never);

    const untracked = makeEntity('ui');
    untracked.x = 10;
    untracked.y = 10;
    reg.register(untracked as never);

    reg.updateAll(16);

    const nearby = reg.getNearby(10, 10, 50);
    expect(nearby).toContain(tracked);
    expect(nearby).not.toContain(untracked);
  });

  it('supports custom spatial tag', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100, spatialTag: 'collidable' });

    const e = makeEntity('enemy', ['collidable']);
    e.x = 10;
    e.y = 10;
    reg.register(e as never);

    reg.updateAll(16);
    expect(reg.getNearby(10, 10, 50)).toContain(e);
  });

  it('getInRect finds entities within bounds', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100 });

    const inside = makeEntity('enemy', ['spatial']);
    inside.x = 50;
    inside.y = 50;
    reg.register(inside as never);

    const outside = makeEntity('enemy', ['spatial']);
    outside.x = 300;
    outside.y = 300;
    reg.register(outside as never);

    reg.updateAll(16);

    const results = reg.getInRect(0, 0, 100, 100);
    expect(results).toContain(inside);
    expect(results).not.toContain(outside);
  });

  it('excludes inactive entities from spatial queries', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100 });

    const e = makeEntity('enemy', ['spatial']);
    e.x = 10;
    e.y = 10;
    reg.register(e as never);

    reg.updateAll(16);
    e.active = false;

    const nearby = reg.getNearby(10, 10, 50);
    expect(nearby).not.toContain(e);
  });

  it('unregister removes entity from spatial hash', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100 });

    const e = makeEntity('enemy', ['spatial']);
    e.x = 10;
    e.y = 10;
    reg.register(e as never);
    reg.updateAll(16);

    reg.unregister(e as never);
    e.active = true; // still active but unregistered

    const nearby = reg.getNearby(10, 10, 50);
    expect(nearby).not.toContain(e);
  });

  it('clear resets spatial hash', () => {
    const reg = new EntityRegistry();
    reg.enableSpatial({ cellSize: 100 });

    const e = makeEntity('enemy', ['spatial']);
    e.x = 10;
    e.y = 10;
    reg.register(e as never);
    reg.updateAll(16);

    reg.clear();
    // After clear, even if we somehow query, nothing should be there
    expect(reg.getNearby(10, 10, 50)).toEqual([]);
  });
});

describe('EntityRegistry — Component Index', () => {
  it('getByComponent returns entities with that component', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('enemy');
    e.addComponent('health');
    reg.register(e as never);

    expect(reg.getByComponent('health')).toContain(e);
  });

  it('findByComponent returns first match', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('enemy');
    e.addComponent('health');
    reg.register(e as never);

    expect(reg.findByComponent('health')).toBe(e);
  });

  it('returns empty for unknown component', () => {
    const reg = new EntityRegistry();
    expect(reg.getByComponent('nonexistent')).toEqual([]);
    expect(reg.findByComponent('nonexistent')).toBeUndefined();
  });

  it('tracks components added after registration', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('enemy');
    reg.register(e as never);
    expect(reg.getByComponent('health')).not.toContain(e);

    e.addComponent('health');
    expect(reg.getByComponent('health')).toContain(e);
  });

  it('removes from index when component removed', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('enemy');
    e.addComponent('health');
    reg.register(e as never);

    e.removeComponent('health');
    expect(reg.getByComponent('health')).not.toContain(e);
  });

  it('unregister cleans component index', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('enemy');
    e.addComponent('health');
    reg.register(e as never);

    reg.unregister(e as never);
    expect(reg.getByComponent('health')).not.toContain(e);
  });
});
