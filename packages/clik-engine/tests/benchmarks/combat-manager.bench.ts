import { describe, bench, beforeEach } from 'vitest';
import { makeBenchScene } from './setup';
import { Entity } from '../../src/entity/Entity';
import { EntityRegistry } from '../../src/entity/EntityRegistry';
import { Hitbox } from '../../src/entity/components/Hitbox';
import { Hurtbox } from '../../src/entity/components/Hurtbox';
import { Health } from '../../src/entity/components/Health';
import { CombatManager } from '../../src/entity/combat/CombatManager';

function createAttacker(scene: Phaser.Scene, x: number, y: number): Entity {
  const e = new Entity(scene, x, y);
  e.entityType = 'attacker';
  e.addComponent(
    'hitbox',
    new Hitbox([{ offsetX: -8, offsetY: -8, width: 16, height: 16, damageAmount: 5, damageType: 'physical' }]),
  );
  e.addTag('spatial');
  return e;
}

function createDefender(scene: Phaser.Scene, x: number, y: number): Entity {
  const e = new Entity(scene, x, y);
  e.entityType = 'defender';
  e.addComponent('hurtbox', new Hurtbox([{ offsetX: -8, offsetY: -8, width: 16, height: 16 }]));
  e.addComponent('health', new Health(100));
  e.addTag('spatial');
  return e;
}

describe('CombatManager Benchmarks', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeBenchScene();
  });

  bench('checkCollisions: 200 entities with spatial', () => {
    const registry = new EntityRegistry();
    registry.enableSpatial({ cellSize: 64 });
    for (let i = 0; i < 100; i++) {
      const a = createAttacker(scene, Math.random() * 1000, Math.random() * 1000);
      registry.register(a);
    }
    for (let i = 0; i < 100; i++) {
      const d = createDefender(scene, Math.random() * 1000, Math.random() * 1000);
      registry.register(d);
    }
    registry.updateAll(0); // Populate spatial hash
    const combat = new CombatManager(registry);
    combat.checkCollisions();
    registry.clear();
  });

  bench('checkCollisions: 200 entities without spatial', () => {
    const registry = new EntityRegistry();
    for (let i = 0; i < 100; i++) {
      const a = createAttacker(scene, Math.random() * 1000, Math.random() * 1000);
      registry.register(a);
    }
    for (let i = 0; i < 100; i++) {
      const d = createDefender(scene, Math.random() * 1000, Math.random() * 1000);
      registry.register(d);
    }
    const combat = new CombatManager(registry);
    combat.checkCollisions();
    registry.clear();
  });

  bench('checkCollisions: 200 entities clustered (worst case)', () => {
    const registry = new EntityRegistry();
    registry.enableSpatial({ cellSize: 64 });
    // All entities in a 100x100 area — high overlap
    for (let i = 0; i < 100; i++) {
      const a = createAttacker(scene, Math.random() * 100, Math.random() * 100);
      registry.register(a);
    }
    for (let i = 0; i < 100; i++) {
      const d = createDefender(scene, Math.random() * 100, Math.random() * 100);
      registry.register(d);
    }
    registry.updateAll(0);
    const combat = new CombatManager(registry);
    combat.checkCollisions();
    registry.clear();
  });

  bench('full update (checkCollisions + applyDamage): 200 entities', () => {
    const registry = new EntityRegistry();
    registry.enableSpatial({ cellSize: 64 });
    for (let i = 0; i < 100; i++) {
      const a = createAttacker(scene, Math.random() * 1000, Math.random() * 1000);
      registry.register(a);
    }
    for (let i = 0; i < 100; i++) {
      const d = createDefender(scene, Math.random() * 1000, Math.random() * 1000);
      registry.register(d);
    }
    registry.updateAll(0);
    const combat = new CombatManager(registry);
    combat.update();
    registry.clear();
  });
});
