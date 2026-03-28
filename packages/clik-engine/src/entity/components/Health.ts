import { Component } from '../Component';
import { ConsoleReporter } from '../../debug/ConsoleReporter';

export class Health extends Component {
  current: number;
  max: number;
  private onDeathCallback?: () => void;
  private onDamageCallback?: (amount: number, remaining: number) => void;

  constructor(max: number) {
    super();
    this.max = max;
    this.current = max;
  }

  onDeath(callback: () => void): this {
    this.onDeathCallback = callback;
    return this;
  }

  onDamage(callback: (amount: number, remaining: number) => void): this {
    this.onDamageCallback = callback;
    return this;
  }

  damage(amount: number): void {
    if (this.current <= 0) return;
    this.current = Math.max(0, this.current - amount);
    ConsoleReporter.state(`${this.entity.entityType}.health: ${this.current}/${this.max}`);
    this.onDamageCallback?.(amount, this.current);
    if (this.current <= 0) {
      this.onDeathCallback?.();
    }
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  get ratio(): number {
    return this.current / this.max;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  reset(): void {
    this.current = this.max;
  }
}
