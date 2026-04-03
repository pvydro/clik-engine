import { describe, bench, beforeEach } from 'vitest';
import { makeBenchScene } from './setup';
import { Entity } from '../../src/entity/Entity';
import { EntityFactory } from '../../src/entity/EntityFactory';
import { EntityPool } from '../../src/entity/EntityPool';
import { EntityRegistry } from '../../src/entity/EntityRegistry';
import { Movement } from '../../src/entity/components/Movement';
import { Health } from '../../src/entity/components/Health';
import { Hitbox } from '../../src/entity/components/Hitbox';
import { Hurtbox } from '../../src/entity/components/Hurtbox';

describe('Entity Pool Benchmarks', () => {
  let scene: Phaser.Scene;
  let factory: EntityFactory;
  let registry: EntityRegistry;

  beforeEach(() => {
    scene = makeBenchScene();
    registry = new EntityRegistry();
    factory = new EntityFactory().useRegistry(registry);
    factory.register('bench-entity', (s, x, y) => {
      const e = new Entity(s, x, y);
      e.entityType = 'bench';
      e.addComponent('movement', new Movement(200));
      e.addComponent('health', new Health(10));
      e.addComponent(
        'hitbox',
        new Hitbox([{ offsetX: -8, offsetY: -8, width: 16, height: 16, damageAmount: 1, damageType: 'physical' }]),
      );
      e.addComponent('hurtbox', new Hurtbox([{ offsetX: -8, offsetY: -8, width: 16, height: 16 }]));
      e.addTag('spatial');
      return e;
    });
  });

  bench('acquire 500 entities', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bench-entity', maxSize: 500 });
    pool.useRegistry(registry);
    for (let i = 0; i < 500; i++) {
      pool.acquire(Math.random() * 1000, Math.random() * 1000);
    }
    pool.destroy();
    registry.clear();
  });

  bench('acquire + release cycle (500)', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bench-entity', maxSize: 500 });
    pool.useRegistry(registry);
    const entities: Entity[] = [];
    for (let i = 0; i < 500; i++) {
      entities.push(pool.acquire(Math.random() * 1000, Math.random() * 1000)!);
    }
    for (const e of entities) {
      pool.release(e);
    }
    pool.destroy();
    registry.clear();
  });

  bench('updateAll with 500 active entities', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bench-entity', maxSize: 500 });
    pool.useRegistry(registry);
    registry.enableSpatial({ cellSize: 64 });
    for (let i = 0; i < 500; i++) {
      const e = pool.acquire(Math.random() * 1000, Math.random() * 1000);
      if (e) {
        const mov = e.getComponent<Movement>('movement')!;
        mov.setVelocity(Math.random() * 200 - 100, Math.random() * 200 - 100);
      }
    }
    registry.updateAll(16.67);
    pool.destroy();
    registry.clear();
  });

  bench('spatial getNearby with 500 entities', () => {
    const pool = new EntityPool(factory, scene, { prefabName: 'bench-entity', maxSize: 500 });
    pool.useRegistry(registry);
    registry.enableSpatial({ cellSize: 64 });
    for (let i = 0; i < 500; i++) {
      pool.acquire(Math.random() * 1000, Math.random() * 1000);
    }
    registry.updateAll(0); // Refresh spatial positions
    // Run 10 queries
    for (let i = 0; i < 10; i++) {
      registry.getNearby(Math.random() * 1000, Math.random() * 1000, 150);
    }
    pool.destroy();
    registry.clear();
  });
});
