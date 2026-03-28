import Phaser from 'phaser';
import { Entity } from './Entity';
import { EntityRegistry } from './EntityRegistry';
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
}
