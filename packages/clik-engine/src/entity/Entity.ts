import Phaser from 'phaser';
import type { Component } from './Component';
import type { EntityRegistry } from './EntityRegistry';

export class Entity extends Phaser.GameObjects.Container {
  private components: Map<string, Component> = new Map();
  private tags: Set<string> = new Set();
  private registry: EntityRegistry | null = null;
  public entityType = 'entity';

  /** @internal Prefab name used by EntityPool to track pool origin */
  _poolPrefab: string | undefined;

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  /** @internal Used by EntityRegistry to track this entity */
  setRegistry(registry: EntityRegistry | null): void {
    this.registry = registry;
  }

  /** @internal Used by EntityRegistry to access the registry reference */
  getRegistry(): EntityRegistry | null {
    return this.registry;
  }

  addComponent<T extends Component>(name: string, component: T): T {
    component.entity = this;
    this.components.set(name, component);
    component.onAttach();
    this.registry?.onComponentAdded(this, name);
    return component;
  }

  getComponent<T extends Component>(name: string): T | undefined {
    return this.components.get(name) as T | undefined;
  }

  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  removeComponent(name: string): void {
    const comp = this.components.get(name);
    if (comp) {
      comp.onDetach();
      this.components.delete(name);
      this.registry?.onComponentRemoved(this, name);
    }
  }

  /** Get all component names on this entity */
  getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }

  addTag(tag: string): this {
    if (!this.tags.has(tag)) {
      this.tags.add(tag);
      this.registry?.onTagAdded(this, tag);
    }
    return this;
  }

  removeTag(tag: string): this {
    if (this.tags.delete(tag)) {
      this.registry?.onTagRemoved(this, tag);
    }
    return this;
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  getTags(): string[] {
    return Array.from(this.tags);
  }

  updateComponents(delta: number): void {
    for (const comp of this.components.values()) {
      if (comp.enabled) {
        comp.update(delta);
      }
    }
  }

  /**
   * Reactivate a pooled entity at a new position.
   * Resets position, visibility, alpha, clears tags, and calls reset() on all components.
   * If a physics body is attached (Arcade or Static), it is re-enabled and
   * snapped to (x, y) — this clears stale velocity/overlap state from the previous use.
   */
  activate(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.active = true;
    this.visible = true;
    this.setAlpha(1);

    // Re-enable and reset physics body if one is attached. Using a narrow
    // structural type so this is safe for entities without a body, Arcade
    // bodies (which have reset()), and Static bodies (which don't).
    const body = (this as unknown as {
      body?: { enable?: boolean; reset?: (x: number, y: number) => void };
    }).body;
    if (body) {
      body.enable = true;
      body.reset?.(x, y);
    }

    // Clear runtime tags (notifying registry)
    for (const tag of Array.from(this.tags)) {
      this.removeTag(tag);
    }

    // Reset all components
    for (const comp of this.components.values()) {
      comp.enabled = true;
      comp.reset();
    }
  }

  /**
   * Deactivate a pooled entity without destroying it.
   * Components remain attached but entity is hidden and inactive.
   * If a physics body is attached, it is disabled so it no longer collides
   * or consumes world iterations while parked at (-9999, -9999).
   */
  deactivate(): void {
    this.active = false;
    this.visible = false;
    this.x = -9999;
    this.y = -9999;

    const body = (this as unknown as { body?: { enable?: boolean } }).body;
    if (body) {
      body.enable = false;
    }
  }

  /** Get debug state for StateInspector */
  getDebugState(): Record<string, unknown> {
    return {
      type: this.entityType,
      x: this.x.toFixed(1),
      y: this.y.toFixed(1),
      components: Array.from(this.components.keys()),
      tags: this.getTags(),
    };
  }

  destroy(fromScene?: boolean): void {
    for (const comp of this.components.values()) {
      comp.onDetach();
    }
    this.components.clear();
    super.destroy(fromScene);
  }
}
