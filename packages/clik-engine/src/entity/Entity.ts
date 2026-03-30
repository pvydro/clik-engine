import Phaser from 'phaser';
import { Component } from './Component';
import type { EntityRegistry } from './EntityRegistry';

export class Entity extends Phaser.GameObjects.Container {
  private components: Map<string, Component> = new Map();
  private tags: Set<string> = new Set();
  private registry: EntityRegistry | null = null;
  public entityType = 'entity';

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  /** @internal Used by EntityRegistry to track this entity */
  setRegistry(registry: EntityRegistry | null): void {
    this.registry = registry;
  }

  addComponent<T extends Component>(name: string, component: T): T {
    component.entity = this;
    this.components.set(name, component);
    component.onAttach();
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
    }
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
