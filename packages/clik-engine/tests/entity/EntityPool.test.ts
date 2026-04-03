import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => {
  class MockContainer {
    x: number; y: number; scene: unknown; active = true; visible = true; alpha = 1; depth = 0;
    _poolPrefab: string | undefined;
    constructor(scene: unknown, x = 0, y = 0) { this.scene = scene; this.x = x; this.y = y; }
    destroy() { this.active = false; }
    setDepth() { return this; }
    setAlpha(a: number) { this.alpha = a; return this; }
  }
  return { default: { GameObjects: { Container: MockContainer } } };
});

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), state: vi.fn(), log: vi.fn() },
}));

import { Entity } from '../../src/entity/Entity';
import { EntityFactory } from '../../src/entity/EntityFactory';
import { EntityRegistry } from '../../src/entity/EntityRegistry';
import { EntityPool } from '../../src/entity/EntityPool';
import { Component } from '../../src/entity/Component';
import { makeTestScene } from '../helpers/TestScene';

class TestComponent extends Component {
  value = 0;
  resetCalled = false;

  reset(): void {
    this.value = 0;
    this.resetCalled = true;
  }
}

describe('EntityPool', () => {
  let scene: Phaser.Scene;
  let factory: EntityFactory;
  let registry: EntityRegistry;

  beforeEach(() => {
    scene = makeTestScene();
    factory = new EntityFactory();
    registry = new EntityRegistry();
    factory.useRegistry(registry);
    factory.register('bullet', (s, x, y) => {
      const e = new Entity(s, x, y);
      e.entityType = 'bullet';
      e.addComponent('test', new TestComponent());
      return e;
    });
  });

  it('acquires a new entity when pool is empty', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.useRegistry(registry);
    const entity = pool.acquire(100, 200);
    expect(entity).not.toBeNull();
    expect(entity!.x).toBe(100);
    expect(entity!.y).toBe(200);
    expect(entity!.active).toBe(true);
    expect(pool.activeCount).toBe(1);
  });

  it('reuses released entities', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.useRegistry(registry);
    const entity1 = pool.acquire(10, 20)!;
    pool.release(entity1);
    expect(pool.availableCount).toBe(1);
    expect(pool.activeCount).toBe(0);

    const entity2 = pool.acquire(50, 60);
    expect(entity2).toBe(entity1);
    expect(entity2!.x).toBe(50);
    expect(entity2!.y).toBe(60);
    expect(entity2!.active).toBe(true);
  });

  it('calls reset() on components when reacquired', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    const entity = pool.acquire(0, 0)!;
    const comp = entity.getComponent<TestComponent>('test')!;
    comp.value = 42;
    comp.resetCalled = false;

    pool.release(entity);
    pool.acquire(10, 10);

    expect(comp.resetCalled).toBe(true);
    expect(comp.value).toBe(0);
  });

  it('respects maxSize', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet', maxSize: 2 });
    pool.acquire(0, 0);
    pool.acquire(0, 0);
    const third = pool.acquire(0, 0);
    expect(third).toBeNull();
    expect(pool.activeCount).toBe(2);
  });

  it('prewarms the pool', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.prewarm(5);
    expect(pool.availableCount).toBe(5);
    expect(pool.activeCount).toBe(0);
  });

  it('prewarm respects maxSize', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet', maxSize: 3 });
    pool.prewarm(10);
    expect(pool.availableCount).toBe(3);
  });

  it('releaseAll returns all active entities to pool', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.acquire(0, 0);
    pool.acquire(0, 0);
    pool.acquire(0, 0);
    expect(pool.activeCount).toBe(3);

    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
    expect(pool.availableCount).toBe(3);
  });

  it('deactivated entities are hidden and offscreen', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    const entity = pool.acquire(100, 200)!;
    pool.release(entity);
    expect(entity.active).toBe(false);
    expect(entity.visible).toBe(false);
    expect(entity.x).toBe(-9999);
    expect(entity.y).toBe(-9999);
  });

  it('registers with EntityRegistry on acquire, unregisters on release', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.useRegistry(registry);
    const entity = pool.acquire(0, 0)!;
    expect(registry.getByType('bullet')).toContain(entity);

    pool.release(entity);
    expect(registry.getByType('bullet')).not.toContain(entity);
  });

  it('clears tags on reacquire', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.useRegistry(registry);
    const entity = pool.acquire(0, 0)!;
    entity.addTag('enemy-bullet');
    expect(entity.hasTag('enemy-bullet')).toBe(true);

    pool.release(entity);
    pool.acquire(10, 10);
    expect(entity.hasTag('enemy-bullet')).toBe(false);
  });

  it('totalCount tracks all managed entities', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    pool.acquire(0, 0);
    pool.acquire(0, 0);
    const e3 = pool.acquire(0, 0)!;
    pool.release(e3);
    expect(pool.totalCount).toBe(3);
    expect(pool.activeCount).toBe(2);
    expect(pool.availableCount).toBe(1);
  });

  it('ignores release of non-pool entity', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    const stray = new Entity(scene, 0, 0);
    pool.release(stray);
    expect(pool.availableCount).toBe(0);
  });

  it('destroy cleans up all entities', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bullet' });
    const e1 = pool.acquire(0, 0)!;
    pool.prewarm(2);
    pool.destroy();
    expect(pool.activeCount).toBe(0);
    expect(pool.availableCount).toBe(0);
    expect(e1.active).toBe(false);
  });
});
