import { Component } from '../Component';
import type { EntityPool } from '../EntityPool';
import { ConsoleReporter } from '../../debug/ConsoleReporter';

export class Lifetime extends Component {
  private remaining: number;
  private duration: number;
  private onExpireCallback?: () => void;
  private fadeOut: boolean;
  private pool: EntityPool | null = null;

  constructor(durationMs: number, fadeOut = false) {
    super();
    this.duration = durationMs;
    this.remaining = durationMs;
    this.fadeOut = fadeOut;
  }

  /** Return to pool on expire instead of destroying */
  usePool(pool: EntityPool): this {
    this.pool = pool;
    return this;
  }

  onExpire(callback: () => void): this {
    this.onExpireCallback = callback;
    return this;
  }

  update(delta: number): void {
    this.remaining -= delta;

    if (this.fadeOut) {
      const alpha = Math.max(0, this.remaining / this.duration);
      this.entity.setAlpha(alpha);
    }

    if (this.remaining <= 0) {
      ConsoleReporter.state(`lifetime expired: ${this.entity.entityType}`);
      this.onExpireCallback?.();
      if (this.pool) {
        this.pool.release(this.entity);
      } else {
        this.entity.destroy();
      }
    }
  }

  getRemaining(): number {
    return Math.max(0, this.remaining);
  }

  getRatio(): number {
    return Math.max(0, this.remaining / this.duration);
  }

  extend(ms: number): void {
    this.remaining += ms;
  }

  reset(): void {
    this.remaining = this.duration;
    this.entity.setAlpha(1);
  }
}
