import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

/**
 * Minimal Entity-like object that satisfies EntityRegistry's interface.
 * We don't instantiate the real Entity class (it requires Phaser).
 */
function makeEntity(type = 'test', tags: string[] = []) {
  const storedTags = new Set(tags);
  let registry: { onTagAdded: (e: unknown, t: string) => void; onTagRemoved: (e: unknown, t: string) => void } | null = null;

  const entity = {
    entityType: type,
    active: true,
    getTags: () => Array.from(storedTags),
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
    getComponentNames: () => [] as string[],
    updateComponents: vi.fn(),
    destroy: vi.fn().mockImplementation(() => { entity.active = false; }),
  };
  return entity;
}

import { EntityRegistry } from '../../src/entity/EntityRegistry';

describe('EntityRegistry', () => {
  it('count starts at zero', () => {
    expect(new EntityRegistry().count).toBe(0);
  });

  it('register increments count', () => {
    const reg = new EntityRegistry();
    reg.register(makeEntity() as never);
    expect(reg.count).toBe(1);
  });

  it('getAll returns registered entities', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    reg.register(e as never);
    expect(reg.getAll()).toContain(e);
  });

  it('unregister decrements count', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    reg.register(e as never);
    reg.unregister(e as never);
    expect(reg.count).toBe(0);
  });

  // --- Type index ---

  it('getByType returns entities with matching type', () => {
    const reg = new EntityRegistry();
    const enemy = makeEntity('enemy');
    const player = makeEntity('player');
    reg.register(enemy as never);
    reg.register(player as never);
    const result = reg.getByType('enemy');
    expect(result).toContain(enemy);
    expect(result).not.toContain(player);
  });

  it('getByType returns empty array for unknown type', () => {
    expect(new EntityRegistry().getByType('ghost')).toEqual([]);
  });

  it('findByType returns first entity of type', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('boss');
    reg.register(e as never);
    expect(reg.findByType('boss')).toBe(e);
  });

  it('findByType returns undefined when not found', () => {
    expect(new EntityRegistry().findByType('missing')).toBeUndefined();
  });

  it('type index is removed when entity is unregistered', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('enemy');
    reg.register(e as never);
    reg.unregister(e as never);
    expect(reg.getByType('enemy')).toEqual([]);
  });

  // --- Tag index ---

  it('getByTag returns entities with that tag', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('mob', ['hostile']);
    reg.register(e as never);
    expect(reg.getByTag('hostile')).toContain(e);
  });

  it('getByTag returns empty array for unknown tag', () => {
    expect(new EntityRegistry().getByTag('invisible')).toEqual([]);
  });

  it('tag index updates when addTag is called after registration', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('mob');
    reg.register(e as never);
    e.addTag('hostile');
    expect(reg.getByTag('hostile')).toContain(e);
  });

  it('tag index updates when removeTag is called', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('mob', ['hostile']);
    reg.register(e as never);
    e.removeTag('hostile');
    expect(reg.getByTag('hostile')).not.toContain(e);
  });

  it('findByTag returns first tagged entity', () => {
    const reg = new EntityRegistry();
    const e = makeEntity('npc', ['friendly']);
    reg.register(e as never);
    expect(reg.findByTag('friendly')).toBe(e);
  });

  it('findByTag returns undefined when not found', () => {
    expect(new EntityRegistry().findByTag('rare')).toBeUndefined();
  });

  // --- updateAll ---

  it('updateAll calls updateComponents on active entities', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    reg.register(e as never);
    reg.updateAll(16);
    expect(e.updateComponents).toHaveBeenCalledWith(16);
  });

  it('updateAll skips inactive entities', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    e.active = false;
    reg.register(e as never);
    reg.updateAll(16);
    expect(e.updateComponents).not.toHaveBeenCalled();
  });

  // --- prune ---

  it('prune removes inactive entities', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    reg.register(e as never);
    e.active = false;
    reg.prune();
    expect(reg.count).toBe(0);
  });

  it('prune keeps active entities', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    reg.register(e as never);
    reg.prune();
    expect(reg.count).toBe(1);
  });

  // --- clear ---

  it('clear destroys all entities and resets count', () => {
    const reg = new EntityRegistry();
    const e = makeEntity();
    reg.register(e as never);
    reg.clear();
    expect(reg.count).toBe(0);
    expect(e.destroy).toHaveBeenCalled();
  });
});
