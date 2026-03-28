import { Component } from '../Component';

export class Timer extends Component {
  private timers: Map<string, { remaining: number; duration: number; repeat: boolean; callback: () => void }> = new Map();

  /** Add a one-shot timer */
  after(name: string, durationMs: number, callback: () => void): this {
    this.timers.set(name, { remaining: durationMs, duration: durationMs, repeat: false, callback });
    return this;
  }

  /** Add a repeating timer */
  every(name: string, intervalMs: number, callback: () => void): this {
    this.timers.set(name, { remaining: intervalMs, duration: intervalMs, repeat: true, callback });
    return this;
  }

  cancel(name: string): void {
    this.timers.delete(name);
  }

  cancelAll(): void {
    this.timers.clear();
  }

  hasTimer(name: string): boolean {
    return this.timers.has(name);
  }

  update(delta: number): void {
    for (const [name, timer] of this.timers) {
      timer.remaining -= delta;
      if (timer.remaining <= 0) {
        timer.callback();
        if (timer.repeat) {
          timer.remaining += timer.duration;
        } else {
          this.timers.delete(name);
        }
      }
    }
  }

  onDetach(): void {
    this.timers.clear();
  }
}
