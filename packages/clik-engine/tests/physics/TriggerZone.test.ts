import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { TriggerZone } from '../../src/physics/TriggerZone';
import { EntityRegistry } from '../../src/entity/EntityRegistry';

function makeEntity(x: number, y: number, type = 'test', tags: string[] = []) {
  const storedTags = new Set(tags);
  const entity = {
    entityType: type,
    active: true,
    x, y,
    getTags: () => Array.from(storedTags),
    getComponentNames: () => [] as string[],
    setRegistry: vi.fn(),
    hasTag: (t: string) => storedTags.has(t),
    addTag: (t: string) => { storedTags.add(t); return entity; },
    updateComponents: vi.fn(),
    destroy: vi.fn(),
  };
  return entity;
}

describe('TriggerZone', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  it('fires onEnter when entity enters AABB zone', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 50, height: 50, shape: 'aabb' });
    const enter = vi.fn();
    zone.onEnter(enter);

    const e = makeEntity(100, 100);
    registry.register(e as never);

    zone.update(registry);
    expect(enter).toHaveBeenCalledWith(e);
  });

  it('fires onStay on subsequent frames', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 50, height: 50 });
    const stay = vi.fn();
    zone.onStay(stay);

    const e = makeEntity(100, 100);
    registry.register(e as never);

    zone.update(registry); // enter
    zone.update(registry); // stay
    expect(stay).toHaveBeenCalledOnce();
  });

  it('fires onExit when entity leaves', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 50, height: 50 });
    const exit = vi.fn();
    zone.onExit(exit);

    const e = makeEntity(100, 100);
    registry.register(e as never);

    zone.update(registry); // enter
    e.x = 500; // move out
    zone.update(registry); // exit
    expect(exit).toHaveBeenCalledWith(e);
  });

  it('works with circle shape', () => {
    const zone = new TriggerZone({ x: 100, y: 100, radius: 30, shape: 'circle' });
    const enter = vi.fn();
    zone.onEnter(enter);

    const inside = makeEntity(110, 110);
    const outside = makeEntity(200, 200);
    registry.register(inside as never);
    registry.register(outside as never);

    zone.update(registry);
    expect(enter).toHaveBeenCalledWith(inside);
    expect(enter).not.toHaveBeenCalledWith(outside);
  });

  it('filters by tag', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 200, height: 200, filterTags: ['player'] });
    const enter = vi.fn();
    zone.onEnter(enter);

    const player = makeEntity(100, 100, 'player', ['player']);
    const enemy = makeEntity(100, 100, 'enemy', ['enemy']);
    registry.register(player as never);
    registry.register(enemy as never);

    zone.update(registry);
    expect(enter).toHaveBeenCalledWith(player);
    expect(enter).not.toHaveBeenCalledWith(enemy);
  });

  it('filters by entity type', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 200, height: 200, filterTypes: ['bullet'] });
    const enter = vi.fn();
    zone.onEnter(enter);

    const bullet = makeEntity(100, 100, 'bullet');
    const enemy = makeEntity(100, 100, 'enemy');
    registry.register(bullet as never);
    registry.register(enemy as never);

    zone.update(registry);
    expect(enter).toHaveBeenCalledWith(bullet);
    expect(enter).not.toHaveBeenCalledWith(enemy);
  });

  it('contains checks point inside AABB', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 50, height: 50 });
    expect(zone.contains(100, 100)).toBe(true);
    expect(zone.contains(75, 75)).toBe(true); // within half-extents
    expect(zone.contains(200, 200)).toBe(false);
  });

  it('setPosition moves the zone', () => {
    const zone = new TriggerZone({ x: 0, y: 0, width: 20, height: 20 });
    expect(zone.contains(100, 100)).toBe(false);
    zone.setPosition(100, 100);
    expect(zone.contains(100, 100)).toBe(true);
  });

  it('disabling fires exit for all inside', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 200, height: 200 });
    const exit = vi.fn();
    zone.onExit(exit);

    const e = makeEntity(100, 100);
    registry.register(e as never);
    zone.update(registry);

    zone.enabled = false;
    expect(exit).toHaveBeenCalledWith(e);
    expect(zone.entityCount).toBe(0);
  });

  it('skips inactive entities', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 200, height: 200 });
    const enter = vi.fn();
    zone.onEnter(enter);

    const e = makeEntity(100, 100);
    e.active = false;
    registry.register(e as never);
    zone.update(registry);
    expect(enter).not.toHaveBeenCalled();
  });

  it('getEntitiesInside returns current occupants', () => {
    const zone = new TriggerZone({ x: 100, y: 100, width: 200, height: 200 });
    const e = makeEntity(100, 100);
    registry.register(e as never);
    zone.update(registry);
    expect(zone.getEntitiesInside()).toContain(e);
  });
});
