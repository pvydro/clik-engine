import type Phaser from 'phaser';
import type { Entity } from './Entity';
import type { EntityFactory } from './EntityFactory';
import type { EntityRegistry } from './EntityRegistry';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface EntityPoolConfig {
  prefabName: string;
  initialSize?: number;
  maxSize?: number;
}

/**
 * Object pool for entities. Reuses deactivated entities instead of creating/destroying them.
 *
 * Usage:
 * ```
 * const pool = new EntityPool(factory, scene, { prefabName: 'bullet', initialSize: 20 });
 * pool.useRegistry(registry);
 *
 * const bullet = pool.acquire(x, y);  // get from pool or create
 * pool.release(bullet);                // return to pool
 * ```
 */
export class EntityPool {
  private pool: Entity[] = [];
  private activeEntities: Set<Entity> = new Set();
  private factory: EntityFactory;
  private scene: Phaser.Scene;
  private prefabName: string;
  private maxSize: number;
  private registry: EntityRegistry | null = null;
  private prefabTags: string[] | null = null;

  constructor(factory: EntityFactory, scene: Phaser.Scene, config: EntityPoolConfig) {
    this.factory = factory;
    this.scene = scene;
    this.prefabName = config.prefabName;
    this.maxSize = config.maxSize ?? 0;
  }

  /** Link to an EntityRegistry — acquired entities auto-register, released entities auto-unregister */
  useRegistry(registry: EntityRegistry): this {
    this.registry = registry;
    return this;
  }

  /** Pre-create entities to avoid allocation during gameplay */
  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.maxSize > 0 && this.pool.length + this.activeEntities.size >= this.maxSize) break;
      const entity = this.createEntity();
      if (entity) {
        entity.deactivate();
        this.pool.push(entity);
      }
    }
    ConsoleReporter.engine(`EntityPool '${this.prefabName}': prewarmed ${this.pool.length} entities`);
  }

  /** Acquire an entity from the pool or create a new one */
  acquire(x: number, y: number): Entity | null {
    if (this.maxSize > 0 && this.activeEntities.size >= this.maxSize) {
      return null;
    }

    let entity: Entity;
    if (this.pool.length > 0) {
      entity = this.pool.pop()!;
    } else {
      const created = this.createEntity();
      if (!created) return null;
      entity = created;
    }

    entity.activate(x, y);

    // Re-apply prefab tags that were cleared by activate()
    if (this.prefabTags) {
      for (const tag of this.prefabTags) {
        entity.addTag(tag);
      }
    }

    this.activeEntities.add(entity);

    if (this.registry) {
      this.registry.register(entity);
    }

    return entity;
  }

  /** Return an entity to the pool for reuse */
  release(entity: Entity): void {
    if (!this.activeEntities.has(entity)) return;

    if (this.registry) {
      this.registry.unregister(entity);
    }

    entity.deactivate();
    this.activeEntities.delete(entity);
    this.pool.push(entity);
  }

  /** Release all active entities back to the pool */
  releaseAll(): void {
    for (const entity of Array.from(this.activeEntities)) {
      this.release(entity);
    }
  }

  /** Number of entities currently in use */
  get activeCount(): number {
    return this.activeEntities.size;
  }

  /** Number of entities available in the pool */
  get availableCount(): number {
    return this.pool.length;
  }

  /** Total entities managed by this pool (active + available) */
  get totalCount(): number {
    return this.activeEntities.size + this.pool.length;
  }

  /** Destroy all entities and clear the pool */
  destroy(): void {
    for (const entity of this.activeEntities) {
      entity.destroy();
    }
    for (const entity of this.pool) {
      entity.destroy();
    }
    this.activeEntities.clear();
    this.pool.length = 0;
  }

  private createEntity(): Entity | null {
    const entity = this.factory.create(this.prefabName, this.scene, -9999, -9999);
    if (entity) {
      entity._poolPrefab = this.prefabName;

      // Capture prefab tags on first creation so acquire() can restore them
      if (this.prefabTags === null) {
        this.prefabTags = entity.getTags();
      }

      // Unregister immediately — factory may auto-register, but pool manages registration
      if (entity.getRegistry()) {
        entity.getRegistry()!.unregister(entity);
      }
    }
    return entity;
  }
}
