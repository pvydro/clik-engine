import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { Spawner } from '../../../src/entity/components/Spawner';
import { makeEntityMock, makeTestScene } from '../../helpers/TestScene';

function makeSpawnedEntity(active = true) {
  return { active, destroy: vi.fn(() => { (this as any).active = false; }) } as unknown;
}

function makeSpawner(intervalMs = 1000, maxActive = 3) {
  const scene = makeTestScene();
  const spawnedEntities: { active: boolean; destroy: ReturnType<typeof vi.fn> }[] = [];
  const factory = vi.fn((_scene: Phaser.Scene, _x: number, _y: number) => {
    const e = { active: true, destroy: vi.fn() };
    e.destroy.mockImplementation(() => { e.active = false; });
    spawnedEntities.push(e);
    return e;
  });

  const spawner = new Spawner(factory as never, intervalMs, maxActive);
  const entity = makeEntityMock(50, 60, scene);
  spawner.entity = entity as never;

  return { spawner, factory, entity, scene, spawnedEntities };
}

describe('Spawner', () => {
  it('constructs with interval and maxActive', () => {
    const { spawner } = makeSpawner(500, 5);
    expect(spawner.getSpawnedCount()).toBe(0);
  });

  it('update spawns entity when elapsed >= interval', () => {
    const { spawner, factory } = makeSpawner(1000, 5);
    spawner.update(500);
    expect(factory).not.toHaveBeenCalled();
    spawner.update(500);
    expect(factory).toHaveBeenCalledOnce();
  });

  it('update resets elapsed after spawning', () => {
    const { spawner, factory } = makeSpawner(1000, 5);
    spawner.update(1000);
    expect(factory).toHaveBeenCalledTimes(1);
    spawner.update(500);
    expect(factory).toHaveBeenCalledTimes(1); // not enough time
    spawner.update(500);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('respects maxActive limit', () => {
    const { spawner, factory } = makeSpawner(100, 2);
    spawner.update(100); // spawn 1
    spawner.update(100); // spawn 2
    spawner.update(100); // should NOT spawn — at max
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('spawn returns null when at max', () => {
    const { spawner } = makeSpawner(100, 1);
    spawner.update(100); // spawn 1
    const result = spawner.spawn();
    expect(result).toBeNull();
  });

  it('prunes destroyed entities, allowing new spawns', () => {
    const { spawner, factory, spawnedEntities } = makeSpawner(100, 2);
    spawner.update(100); // spawn 1
    spawner.update(100); // spawn 2
    // Destroy one
    spawnedEntities[0].active = false;
    spawner.update(100); // should spawn again since one is inactive
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('getSpawnedCount only counts active entities', () => {
    const { spawner, spawnedEntities } = makeSpawner(100, 5);
    spawner.update(100);
    spawner.update(100);
    expect(spawner.getSpawnedCount()).toBe(2);
    spawnedEntities[0].active = false;
    expect(spawner.getSpawnedCount()).toBe(1);
  });

  it('setActive(false) prevents spawning', () => {
    const { spawner, factory } = makeSpawner(100, 5);
    spawner.setActive(false);
    spawner.update(1000);
    expect(factory).not.toHaveBeenCalled();
  });

  it('setInterval changes spawn interval', () => {
    const { spawner, factory } = makeSpawner(1000, 5);
    spawner.setInterval(200);
    spawner.update(200);
    expect(factory).toHaveBeenCalledOnce();
  });

  it('destroyAllSpawned destroys active entities', () => {
    const { spawner, spawnedEntities } = makeSpawner(100, 5);
    spawner.update(100);
    spawner.update(100);
    spawner.destroyAllSpawned();
    expect(spawnedEntities[0].destroy).toHaveBeenCalled();
    expect(spawnedEntities[1].destroy).toHaveBeenCalled();
    expect(spawner.getSpawnedCount()).toBe(0);
  });

  it('onDetach destroys all spawned entities', () => {
    const { spawner, spawnedEntities } = makeSpawner(100, 5);
    spawner.update(100);
    spawner.onDetach();
    expect(spawnedEntities[0].destroy).toHaveBeenCalled();
  });

  it('spawn passes entity position plus offset to factory', () => {
    const { spawner, factory, entity } = makeSpawner(10000, 5);
    entity.x = 50;
    entity.y = 60;
    spawner.spawn(10, 20);
    expect(factory).toHaveBeenCalledWith(entity.scene, 60, 80);
  });
});
