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
import { EntityRegistry } from '../../../src/entity/EntityRegistry';
import { CombatManager } from '../../../src/entity/combat/CombatManager';
import { Hitbox } from '../../../src/entity/components/Hitbox';
import { Hurtbox } from '../../../src/entity/components/Hurtbox';
import { Health } from '../../../src/entity/components/Health';
import { makeTestScene } from '../../helpers/TestScene';

describe('CombatManager', () => {
  let scene: Phaser.Scene;
  let registry: EntityRegistry;
  let combat: CombatManager;

  beforeEach(() => {
    scene = makeTestScene();
    registry = new EntityRegistry();
    combat = new CombatManager(registry);
  });

  function makeAttacker(x: number, y: number, damage = 10) {
    const e = new Entity(scene, x, y);
    e.entityType = 'bullet';
    e.addComponent('hitbox', new Hitbox([
      { offsetX: -4, offsetY: -4, width: 8, height: 8, damageAmount: damage, damageType: 'physical' },
    ]));
    registry.register(e);
    return e;
  }

  function makeDefender(x: number, y: number, hp = 100) {
    const e = new Entity(scene, x, y);
    e.entityType = 'enemy';
    e.addComponent('hurtbox', new Hurtbox([
      { offsetX: -8, offsetY: -8, width: 16, height: 16 },
    ]));
    e.addComponent('health', new Health(hp));
    registry.register(e);
    return e;
  }

  it('detects overlapping hitbox and hurtbox', () => {
    makeAttacker(100, 100);
    makeDefender(105, 105);

    const events = combat.checkCollisions();
    expect(events).toHaveLength(1);
    expect(events[0].amount).toBe(10);
    expect(events[0].type).toBe('physical');
  });

  it('no collision when entities are far apart', () => {
    makeAttacker(0, 0);
    makeDefender(500, 500);

    const events = combat.checkCollisions();
    expect(events).toHaveLength(0);
  });

  it('does not collide entity with itself', () => {
    const e = new Entity(scene, 100, 100);
    e.addComponent('hitbox', new Hitbox([
      { offsetX: -4, offsetY: -4, width: 8, height: 8, damageAmount: 5 },
    ]));
    e.addComponent('hurtbox', new Hurtbox([
      { offsetX: -4, offsetY: -4, width: 8, height: 8 },
    ]));
    e.addComponent('health', new Health(50));
    registry.register(e);

    const events = combat.checkCollisions();
    expect(events).toHaveLength(0);
  });

  it('skips defender with active iframes', () => {
    makeAttacker(100, 100);
    const defender = makeDefender(105, 105);
    defender.getComponent<Hurtbox>('hurtbox')!.triggerIframes(1000);

    const events = combat.checkCollisions();
    expect(events).toHaveLength(0);
  });

  it('applyDamage reduces health', () => {
    const attacker = makeAttacker(100, 100, 25);
    const defender = makeDefender(105, 105, 100);

    const events = combat.checkCollisions();
    for (const event of events) combat.applyDamage(event);

    const health = defender.getComponent<Health>('health')!;
    expect(health.current).toBe(75);
  });

  it('update runs check + apply in one call', () => {
    makeAttacker(100, 100, 30);
    const defender = makeDefender(105, 105, 100);

    combat.update();
    expect(defender.getComponent<Health>('health')!.current).toBe(70);
  });

  it('fires onDamage callback', () => {
    const cb = vi.fn();
    combat.onDamage(cb);

    makeAttacker(100, 100, 10);
    makeDefender(105, 105, 100);

    combat.update();
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0].amount).toBe(10);
  });

  it('fires onKill callback when health reaches zero', () => {
    const killCb = vi.fn();
    combat.onKill(killCb);

    makeAttacker(100, 100, 50);
    makeDefender(105, 105, 50);

    combat.update();
    expect(killCb).toHaveBeenCalledOnce();
  });

  it('does not fire onKill when entity survives', () => {
    const killCb = vi.fn();
    combat.onKill(killCb);

    makeAttacker(100, 100, 10);
    makeDefender(105, 105, 100);

    combat.update();
    expect(killCb).not.toHaveBeenCalled();
  });

  it('skips inactive attackers', () => {
    const attacker = makeAttacker(100, 100);
    attacker.active = false;
    makeDefender(105, 105);

    expect(combat.checkCollisions()).toHaveLength(0);
  });

  it('health shield absorbs damage', () => {
    makeAttacker(100, 100, 30);
    const defender = makeDefender(105, 105, 100);
    defender.getComponent<Health>('health')!.addShield(20, 20);

    combat.update();
    const health = defender.getComponent<Health>('health')!;
    expect(health.shield).toBe(0);
    expect(health.current).toBe(90); // 30 - 20 shield = 10 actual damage
  });

  it('health damage modifier scales damage', () => {
    makeAttacker(100, 100, 20);
    const defender = makeDefender(105, 105, 100);
    const health = defender.getComponent<Health>('health')!;
    health.setModifier('physical', 0.5);

    combat.update();
    expect(health.current).toBe(90); // 20 * 0.5 = 10
  });
});
