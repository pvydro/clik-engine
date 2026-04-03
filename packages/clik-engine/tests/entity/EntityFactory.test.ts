import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn() },
}));

// Mock Phaser Scene minimally
const mockScene = {
  add: { existing: vi.fn() },
} as unknown;

import { EntityFactory } from '../../src/entity/EntityFactory';
import { Entity } from '../../src/entity/Entity';
import { EntityRegistry } from '../../src/entity/EntityRegistry';

// Patch Entity to not call Phaser
vi.mock('../../src/entity/Entity', () => {
  return {
    Entity: class MockEntity {
      x: number;
      y: number;
      entityType = 'entity';
      active = true;
      scene: unknown;
      constructor(scene: unknown, x: number, y: number) {
        this.scene = scene;
        this.x = x;
        this.y = y;
      }
      getTags() { return []; }
      getComponentNames() { return []; }
      setRegistry() {}
    },
  };
});

describe('EntityFactory', () => {
  it('registers and creates prefabs', () => {
    const factory = new EntityFactory();
    factory.register('enemy', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'enemy';
      return e;
    });

    const entity = factory.create('enemy', mockScene as any, 100, 200);
    expect(entity).not.toBeNull();
    expect(entity!.entityType).toBe('enemy');
    expect(entity!.x).toBe(100);
  });

  it('returns null for unknown prefab', () => {
    const factory = new EntityFactory();
    expect(factory.create('unknown', mockScene as any, 0, 0)).toBeNull();
  });

  it('checks if prefab exists', () => {
    const factory = new EntityFactory();
    factory.register('player', (s, x, y) => new Entity(s, x, y));
    expect(factory.has('player')).toBe(true);
    expect(factory.has('npc')).toBe(false);
  });

  it('lists prefab names', () => {
    const factory = new EntityFactory();
    factory.register('a', (s, x, y) => new Entity(s, x, y));
    factory.register('b', (s, x, y) => new Entity(s, x, y));
    expect(factory.getPrefabNames()).toEqual(['a', 'b']);
  });

  it('creates many at positions', () => {
    const factory = new EntityFactory();
    factory.register('coin', (s, x, y) => new Entity(s, x, y));
    const entities = factory.createMany('coin', mockScene as any, [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]);
    expect(entities).toHaveLength(3);
    expect(entities[2].x).toBe(50);
  });

  it('auto-registers with EntityRegistry', () => {
    const registry = new EntityRegistry();
    const factory = new EntityFactory().useRegistry(registry);
    factory.register('item', (s, x, y) => new Entity(s, x, y));
    factory.create('item', mockScene as any, 0, 0);
    expect(registry.count).toBe(1);
  });

  it('unregisters prefabs', () => {
    const factory = new EntityFactory();
    factory.register('temp', (s, x, y) => new Entity(s, x, y));
    factory.unregister('temp');
    expect(factory.has('temp')).toBe(false);
  });
});
