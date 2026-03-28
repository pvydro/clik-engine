import { Entity } from './Entity';

export class EntityRegistry {
  private entities: Set<Entity> = new Set();

  register(entity: Entity): void {
    this.entities.add(entity);
  }

  unregister(entity: Entity): void {
    this.entities.delete(entity);
  }

  /** Update all registered entity components */
  updateAll(delta: number): void {
    for (const entity of this.entities) {
      if (entity.active) {
        entity.updateComponents(delta);
      }
    }
  }

  /** Get all entities */
  getAll(): Entity[] {
    return Array.from(this.entities);
  }

  /** Query by entity type */
  getByType(type: string): Entity[] {
    return this.getAll().filter(e => e.entityType === type);
  }

  /** Query by tag */
  getByTag(tag: string): Entity[] {
    return this.getAll().filter(e => e.hasTag(tag));
  }

  /** Get the first entity matching a type */
  findByType(type: string): Entity | undefined {
    for (const entity of this.entities) {
      if (entity.entityType === type) return entity;
    }
    return undefined;
  }

  /** Get the first entity matching a tag */
  findByTag(tag: string): Entity | undefined {
    for (const entity of this.entities) {
      if (entity.hasTag(tag)) return entity;
    }
    return undefined;
  }

  /** Count active entities */
  get count(): number {
    return this.entities.size;
  }

  /** Destroy all entities and clear registry */
  clear(): void {
    for (const entity of this.entities) {
      entity.destroy();
    }
    this.entities.clear();
  }

  /** Remove destroyed entities from the registry */
  prune(): void {
    for (const entity of this.entities) {
      if (!entity.active) {
        this.entities.delete(entity);
      }
    }
  }
}
