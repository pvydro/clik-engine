import type Phaser from 'phaser';
import type { Entity } from './Entity';
import type { EntityRegistry } from './EntityRegistry';
import type { EntityPoolConfig } from './EntityPool';
import { EntityPool } from './EntityPool';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export type EntityBuilder = (scene: Phaser.Scene, x: number, y: number) => Entity;

/**
 * Factory for creating entities from registered prefabs.
 * Define a prefab once, spawn instances by name.
 *
 * Usage:
 * ```
 * factory.register('enemy', (scene, x, y) => {
 *   const e = new Entity(scene, x, y);
 *   e.entityType = 'enemy';
 *   e.addComponent('health', new Health(50));
 *   e.addComponent('patrol', new Patrol([...]));
 *   return e;
 * });
 *
 * const enemy = factory.create('enemy', 100, 200);
 * ```
 */
export class EntityFactory {
  private prefabs: Map<string, EntityBuilder> = new Map();
  private registry: EntityRegistry | null = null;
  private pools: Map<string, EntityPool> = new Map();

  /** Optionally link to an EntityRegistry for automatic registration */
  useRegistry(registry: EntityRegistry): this {
    this.registry = registry;
    return this;
  }

  /** Register a prefab builder */
  register(name: string, builder: EntityBuilder): this {
    this.prefabs.set(name, builder);
    return this;
  }

  /** Create an entity from a registered prefab */
  create(name: string, scene: Phaser.Scene, x: number, y: number): Entity | null {
    const builder = this.prefabs.get(name);
    if (!builder) {
      ConsoleReporter.error(
        `EntityFactory: prefab '${name}' not found`,
        `Registered prefabs: ${Array.from(this.prefabs.keys()).join(', ')}`
      );
      return null;
    }

    const entity = builder(scene, x, y);
    if (this.registry) {
      this.registry.register(entity);
    }

    ConsoleReporter.engine(`EntityFactory: created '${name}' at (${x}, ${y})`);
    return entity;
  }

  /** Create multiple entities at positions */
  createMany(name: string, scene: Phaser.Scene, positions: { x: number; y: number }[]): Entity[] {
    return positions
      .map(pos => this.create(name, scene, pos.x, pos.y))
      .filter((e): e is Entity => e !== null);
  }

  /** Check if a prefab is registered */
  has(name: string): boolean {
    return this.prefabs.has(name);
  }

  /** Get all registered prefab names */
  getPrefabNames(): string[] {
    return Array.from(this.prefabs.keys());
  }

  /** Remove a prefab registration */
  unregister(name: string): void {
    this.prefabs.delete(name);
  }

  /** Create an entity pool for a registered prefab */
  createPool(name: string, scene: Phaser.Scene, config?: Partial<Omit<EntityPoolConfig, 'prefabName'>>): EntityPool {
    const pool = new EntityPool(this, scene, {
      prefabName: name,
      ...config,
    });
    if (this.registry) {
      pool.useRegistry(this.registry);
    }
    this.pools.set(name, pool);
    return pool;
  }

  /** Acquire an entity from its prefab pool (creates pool lazily if needed) */
  acquirePooled(name: string, scene: Phaser.Scene, x: number, y: number): Entity | null {
    let pool = this.pools.get(name);
    if (!pool) {
      pool = this.createPool(name, scene);
    }
    return pool.acquire(x, y);
  }

  /** Release an entity back to its pool */
  releasePooled(entity: Entity): void {
    const prefab = entity._poolPrefab;
    if (!prefab) {
      ConsoleReporter.error('EntityFactory.releasePooled: entity has no pool origin');
      return;
    }
    const pool = this.pools.get(prefab);
    if (!pool) {
      ConsoleReporter.error(`EntityFactory.releasePooled: no pool for prefab '${prefab}'`);
      return;
    }
    pool.release(entity);
  }

  /** Get a pool by prefab name */
  getPool(name: string): EntityPool | undefined {
    return this.pools.get(name);
  }

  /** Destroy all pools */
  destroyPools(): void {
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
  }
}
