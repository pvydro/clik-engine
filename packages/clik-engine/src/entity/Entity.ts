import Phaser from 'phaser';
import { Component } from './Component';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export class Entity extends Phaser.GameObjects.Container {
  private components: Map<string, Component> = new Map();
  private tags: Set<string> = new Set();
  public entityType = 'entity';

  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y);
    scene.add.existing(this);
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
    this.tags.add(tag);
    return this;
  }

  removeTag(tag: string): this {
    this.tags.delete(tag);
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
