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
import { WaveManager } from '../../../src/entity/combat/WaveManager';
import { makeTestScene } from '../../helpers/TestScene';

describe('WaveManager', () => {
  let scene: Phaser.Scene;
  let factory: EntityFactory;
  let registry: EntityRegistry;

  beforeEach(() => {
    scene = makeTestScene();
    factory = new EntityFactory();
    registry = new EntityRegistry();
    factory.useRegistry(registry);
    factory.register('enemy', (s, x, y) => {
      const e = new Entity(s, x, y);
      e.entityType = 'enemy';
      return e;
    });

    // Need at least one entity registered so WaveManager can get scene
    const sentinel = new Entity(scene, 0, 0);
    registry.register(sentinel);
  });

  it('starts with correct wave count', () => {
    const wm = new WaveManager(factory, registry);
    wm.setWaves([
      { spawns: [{ prefab: 'enemy', count: 3 }] },
      { spawns: [{ prefab: 'enemy', count: 5 }] },
    ]);

    expect(wm.totalWaves).toBe(2);
    expect(wm.isComplete).toBe(false);
  });

  it('spawns enemies on start', () => {
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 3 }] }]);
    wm.start();

    // First update transitions to spawning phase, second update spawns
    wm.update(16);
    wm.update(16);
    expect(wm.enemiesRemaining).toBeGreaterThan(0);
  });

  it('fires onWaveStart callback', () => {
    const cb = vi.fn();
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 1 }] }]);
    wm.onWaveStart(cb);
    wm.start();

    wm.update(16);
    expect(cb).toHaveBeenCalledWith(0);
  });

  it('fires onSpawn callback for each spawned entity', () => {
    const cb = vi.fn();
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 3 }] }]);
    wm.onSpawn(cb);
    wm.start();

    // First update transitions to spawning, subsequent updates spawn 1 each (no interval)
    for (let i = 0; i < 5; i++) wm.update(16);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('detects wave completion when all enemies destroyed', () => {
    const completeCb = vi.fn();
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 2 }] }]);
    wm.onWaveComplete(completeCb);
    wm.start();

    // Spawn enemies (transition + 2 spawns)
    for (let i = 0; i < 4; i++) wm.update(16);

    // Get spawned enemies and destroy them
    const enemies = registry.getByType('enemy');
    for (const e of enemies) {
      if (e.entityType === 'enemy') e.destroy();
    }

    wm.update(16);
    expect(completeCb).toHaveBeenCalledWith(0);
  });

  it('fires onAllComplete after last wave', () => {
    const allCb = vi.fn();
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 1 }] }]);
    wm.onAllComplete(allCb);
    wm.start();

    // Transition + spawn
    wm.update(16);
    wm.update(16);

    // Destroy enemies
    for (const e of registry.getByType('enemy')) e.destroy();

    // waitClear → delayAfter → nextWave → complete
    wm.update(16);
    wm.update(16);

    expect(wm.isComplete).toBe(true);
    expect(allCb).toHaveBeenCalled();
  });

  it('respects delayBefore', () => {
    const startCb = vi.fn();
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 1 }], delayBefore: 1000 }]);
    wm.onWaveStart(startCb);
    wm.start();

    wm.update(500);
    expect(startCb).not.toHaveBeenCalled();

    wm.update(600);
    expect(startCb).toHaveBeenCalled();
  });

  it('pause stops progression', () => {
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{ spawns: [{ prefab: 'enemy', count: 5 }] }]);
    wm.start();

    wm.update(16); // transition
    wm.update(16); // spawn 1
    const countBefore = wm.enemiesRemaining;

    wm.pause();
    wm.update(16);
    wm.update(16);
    expect(wm.enemiesRemaining).toBe(countBefore);

    wm.resume();
    wm.update(16);
    expect(wm.enemiesRemaining).toBeGreaterThanOrEqual(countBefore);
  });

  it('spawns in specified area', () => {
    const spawnCb = vi.fn();
    const wm = new WaveManager(factory, registry);
    wm.setWaves([{
      spawns: [{
        prefab: 'enemy',
        count: 1,
        spawnArea: { x: 100, y: 200, width: 50, height: 50 },
      }],
    }]);
    wm.onSpawn(spawnCb);
    wm.start();
    wm.update(16); // transition
    wm.update(16); // spawn

    const entity = spawnCb.mock.calls[0]?.[0] as Entity;
    expect(entity).toBeDefined();
    expect(entity.x).toBeGreaterThanOrEqual(100);
    expect(entity.x).toBeLessThanOrEqual(150);
    expect(entity.y).toBeGreaterThanOrEqual(200);
    expect(entity.y).toBeLessThanOrEqual(250);
  });
});
