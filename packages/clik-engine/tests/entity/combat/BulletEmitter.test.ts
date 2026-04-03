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

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { Entity } from '../../../src/entity/Entity';
import { EntityFactory } from '../../../src/entity/EntityFactory';
import { EntityRegistry } from '../../../src/entity/EntityRegistry';
import { EntityPool } from '../../../src/entity/EntityPool';
import { BulletEmitter } from '../../../src/entity/components/BulletEmitter';
import { Movement } from '../../../src/entity/components/Movement';
import { makeTestScene } from '../../helpers/TestScene';

describe('BulletEmitter', () => {
  let scene: Phaser.Scene;
  let factory: EntityFactory;
  let registry: EntityRegistry;
  let pool: EntityPool;
  let emitterEntity: Entity;

  beforeEach(() => {
    scene = makeTestScene();
    factory = new EntityFactory();
    registry = new EntityRegistry();
    factory.useRegistry(registry);
    factory.register('bullet', (s, x, y) => {
      const e = new Entity(s, x, y);
      e.entityType = 'bullet';
      e.addComponent('movement', new Movement(300));
      return e;
    });
    pool = factory.createPool('bullet', scene, { maxSize: 50 });

    emitterEntity = new Entity(scene, 400, 300);
    registry.register(emitterEntity);
  });

  it('fires radial burst', () => {
    const emitter = new BulletEmitter(pool, { type: 'radial', count: 8, fireRateMs: 0 });
    emitter.entity = emitterEntity;

    const bullets = emitter.fire();
    expect(bullets).toHaveLength(8);
    expect(pool.activeCount).toBe(8);
  });

  it('fires aimed shot at target', () => {
    const emitter = new BulletEmitter(pool, { type: 'aimed', fireRateMs: 0 });
    emitter.entity = emitterEntity;
    emitter.setTarget({ x: 500, y: 300 }); // target to the right

    const bullets = emitter.fire();
    expect(bullets).toHaveLength(1);

    const movement = bullets[0].getComponent<Movement>('movement')!;
    const vel = movement.getVelocity();
    expect(vel.x).toBeGreaterThan(0); // moving right
    expect(Math.abs(vel.y)).toBeLessThan(1); // not moving much vertically
  });

  it('respects fire rate cooldown', () => {
    const emitter = new BulletEmitter(pool, { type: 'radial', count: 4, fireRateMs: 500 });
    emitter.entity = emitterEntity;

    const first = emitter.fire();
    expect(first).toHaveLength(4);

    // Can't fire again immediately
    const second = emitter.fire();
    expect(second).toHaveLength(0);

    // After cooldown
    emitter.update(500);
    const third = emitter.fire();
    expect(third).toHaveLength(4);
  });

  it('auto-fire spawns on update', () => {
    const emitter = new BulletEmitter(pool, { type: 'stream', fireRateMs: 100 });
    emitter.entity = emitterEntity;
    emitter.setAutoFire(true);

    emitter.update(100); // triggers cooldown + auto-fire
    expect(pool.activeCount).toBe(1);
  });

  it('shotgun fires spread of bullets', () => {
    const emitter = new BulletEmitter(pool, { type: 'shotgun', count: 5, angleSpread: Math.PI / 2, fireRateMs: 0 });
    emitter.entity = emitterEntity;
    emitter.setTarget({ x: 500, y: 300 });

    const bullets = emitter.fire();
    expect(bullets).toHaveLength(5);
  });

  it('respects pool maxSize', () => {
    const smallPool = factory.createPool('bullet', scene, { maxSize: 3 });
    const emitter = new BulletEmitter(smallPool, { type: 'radial', count: 10, fireRateMs: 0 });
    emitter.entity = emitterEntity;

    const bullets = emitter.fire();
    expect(bullets).toHaveLength(3);
  });

  it('reset clears state', () => {
    const emitter = new BulletEmitter(pool, { type: 'radial', count: 4, fireRateMs: 500 });
    emitter.entity = emitterEntity;

    emitter.fire();
    emitter.setAutoFire(true);
    emitter.setTarget({ x: 0, y: 0 });

    emitter.reset();
    // Cooldown should be reset, so fire works immediately
    const bullets = emitter.fire();
    expect(bullets).toHaveLength(4);
  });

  it('static radialBurst helper', () => {
    const emitter = BulletEmitter.radialBurst(pool, { count: 6, fireRateMs: 0 });
    emitter.entity = emitterEntity;
    expect(emitter.fire()).toHaveLength(6);
  });

  it('static aimedStream helper', () => {
    const emitter = BulletEmitter.aimedStream(pool, { x: 500, y: 300 }, { fireRateMs: 0 });
    emitter.entity = emitterEntity;
    expect(emitter.fire()).toHaveLength(1);
  });
});
