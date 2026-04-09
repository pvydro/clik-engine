import type Phaser from 'phaser';
import { Component } from '../Component';
import { ConsoleReporter } from '../../debug/ConsoleReporter';

export class Collectible extends Component {
  private collected = false;
  private value: number;
  private type: string;
  private onCollectCallback?: (collector: Phaser.GameObjects.GameObject) => void;

  constructor(type = 'coin', value = 1) {
    super();
    this.type = type;
    this.value = value;
  }

  onCollect(callback: (collector: Phaser.GameObjects.GameObject) => void): this {
    this.onCollectCallback = callback;
    return this;
  }

  collect(collector: Phaser.GameObjects.GameObject): boolean {
    if (this.collected) return false;
    this.collected = true;
    ConsoleReporter.state(`collected: ${this.type} (value: ${this.value})`);
    this.onCollectCallback?.(collector);
    return true;
  }

  isCollected(): boolean {
    return this.collected;
  }

  getType(): string {
    return this.type;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.collected = false;
  }
}
