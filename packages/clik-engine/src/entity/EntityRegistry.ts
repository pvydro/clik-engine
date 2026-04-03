import { Entity } from './Entity';

export class EntityRegistry {
  private entities: Set<Entity> = new Set();
  private typeIndex: Map<string, Set<Entity>> = new Map();
  private tagIndex: Map<string, Set<Entity>> = new Map();
  private componentIndex: Map<string, Set<Entity>> = new Map();

  register(entity: Entity): void {
    this.entities.add(entity);
    // Index by type
    this.addToIndex(this.typeIndex, entity.entityType, entity);
    // Index existing tags
    for (const tag of entity.getTags()) {
      this.addToIndex(this.tagIndex, tag, entity);
    }
    // Index existing components
    for (const name of entity.getComponentNames()) {
      this.addToIndex(this.componentIndex, name, entity);
    }
    // Listen for tag/component changes
    entity.setRegistry(this);
  }

  unregister(entity: Entity): void {
    this.entities.delete(entity);
    this.removeFromIndex(this.typeIndex, entity.entityType, entity);
    for (const tag of entity.getTags()) {
      this.removeFromIndex(this.tagIndex, tag, entity);
    }
    for (const name of entity.getComponentNames()) {
      this.removeFromIndex(this.componentIndex, name, entity);
    }
    entity.setRegistry(null);
  }

  /** Called by Entity when a tag is added */
  onTagAdded(entity: Entity, tag: string): void {
    this.addToIndex(this.tagIndex, tag, entity);
  }

  /** Called by Entity when a tag is removed */
  onTagRemoved(entity: Entity, tag: string): void {
    this.removeFromIndex(this.tagIndex, tag, entity);
  }

  /** Called by Entity when a component is added */
  onComponentAdded(entity: Entity, name: string): void {
    this.addToIndex(this.componentIndex, name, entity);
  }

  /** Called by Entity when a component is removed */
  onComponentRemoved(entity: Entity, name: string): void {
    this.removeFromIndex(this.componentIndex, name, entity);
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

  /** Query by entity type — O(1) via index */
  getByType(type: string): Entity[] {
    const set = this.typeIndex.get(type);
    return set ? Array.from(set) : [];
  }

  /** Query by tag — O(1) via index */
  getByTag(tag: string): Entity[] {
    const set = this.tagIndex.get(tag);
    return set ? Array.from(set) : [];
  }

  /** Get the first entity matching a type */
  findByType(type: string): Entity | undefined {
    const set = this.typeIndex.get(type);
    if (!set) return undefined;
    for (const entity of set) return entity;
    return undefined;
  }

  /** Get the first entity matching a tag */
  findByTag(tag: string): Entity | undefined {
    const set = this.tagIndex.get(tag);
    if (!set) return undefined;
    for (const entity of set) return entity;
    return undefined;
  }

  /** Query by component name — O(1) via index */
  getByComponent(name: string): Entity[] {
    const set = this.componentIndex.get(name);
    return set ? Array.from(set) : [];
  }

  /** Get the first entity with a given component */
  findByComponent(name: string): Entity | undefined {
    const set = this.componentIndex.get(name);
    if (!set) return undefined;
    for (const entity of set) return entity;
    return undefined;
  }

  /** Count active entities */
  get count(): number {
    return this.entities.size;
  }

  /** Destroy all entities and clear registry */
  clear(): void {
    for (const entity of this.entities) {
      entity.setRegistry(null);
      entity.destroy();
    }
    this.entities.clear();
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.componentIndex.clear();
  }

  /** Remove destroyed entities from the registry */
  prune(): void {
    for (const entity of this.entities) {
      if (!entity.active) {
        this.unregister(entity);
      }
    }
  }

  private addToIndex(index: Map<string, Set<Entity>>, key: string, entity: Entity): void {
    let set = index.get(key);
    if (!set) {
      set = new Set();
      index.set(key, set);
    }
    set.add(entity);
  }

  private removeFromIndex(index: Map<string, Set<Entity>>, key: string, entity: Entity): void {
    const set = index.get(key);
    if (set) {
      set.delete(entity);
      if (set.size === 0) index.delete(key);
    }
  }
}
