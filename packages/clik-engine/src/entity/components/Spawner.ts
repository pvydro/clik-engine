import Phaser from 'phaser';
import { Component } from '../Component';
import { Entity } from '../Entity';
import { ConsoleReporter } from '../../debug/ConsoleReporter';

export class Spawner extends Component {
  private factory: (scene: Phaser.Scene, x: number, y: number) => Entity;
  private spawnInterval: number;
  private maxActive: number;
  private elapsed = 0;
  private spawned: Entity[] = [];
  private active = true;

  constructor(
    factory: (scene: Phaser.Scene, x: number, y: number) => Entity,
    intervalMs = 2000,
    maxActive = 10,
  ) {
    super();
    this.factory = factory;
    this.spawnInterval = intervalMs;
    this.maxActive = maxActive;
  }

  update(delta: number): void {
    if (!this.active) return;

    // Prune destroyed entities
    this.spawned = this.spawned.filter(e => e.active);

    this.elapsed += delta;
    if (this.elapsed >= this.spawnInterval && this.spawned.length < this.maxActive) {
      this.elapsed = 0;
      this.spawn();
    }
  }

  spawn(offsetX = 0, offsetY = 0): Entity | null {
    if (this.spawned.length >= this.maxActive) return null;

    const entity = this.factory(this.entity.scene, this.entity.x + offsetX, this.entity.y + offsetY);
    this.spawned.push(entity);
    ConsoleReporter.state(`spawner: created entity (${this.spawned.length}/${this.maxActive})`);
    return entity;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  setInterval(ms: number): void {
    this.spawnInterval = ms;
  }

  getSpawnedCount(): number {
    return this.spawned.filter(e => e.active).length;
  }

  destroyAllSpawned(): void {
    for (const entity of this.spawned) {
      if (entity.active) entity.destroy();
    }
    this.spawned = [];
  }

  onDetach(): void {
    this.destroyAllSpawned();
  }

  reset(): void {
    this.elapsed = 0;
    this.spawned = [];
    this.active = true;
  }
}
