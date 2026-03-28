/**
 * Frame-rate independent game timer.
 * Useful for countdowns, cooldowns, wave timers, etc.
 * Update with delta (ms) each frame.
 */
export class GameTimer {
  private remaining: number;
  private duration: number;
  private running = false;
  private paused = false;
  private onCompleteCb?: () => void;
  private onTickCb?: (remaining: number, ratio: number) => void;

  constructor(durationMs: number) {
    this.duration = durationMs;
    this.remaining = durationMs;
  }

  start(): this {
    this.remaining = this.duration;
    this.running = true;
    this.paused = false;
    return this;
  }

  stop(): this {
    this.running = false;
    return this;
  }

  pause(): this {
    this.paused = true;
    return this;
  }

  resume(): this {
    this.paused = false;
    return this;
  }

  reset(): this {
    this.remaining = this.duration;
    return this;
  }

  /** Update each frame with delta in ms */
  update(delta: number): void {
    if (!this.running || this.paused) return;

    this.remaining -= delta;
    this.onTickCb?.(Math.max(0, this.remaining), this.ratio);

    if (this.remaining <= 0) {
      this.remaining = 0;
      this.running = false;
      this.onCompleteCb?.();
    }
  }

  onComplete(callback: () => void): this {
    this.onCompleteCb = callback;
    return this;
  }

  onTick(callback: (remaining: number, ratio: number) => void): this {
    this.onTickCb = callback;
    return this;
  }

  get isRunning(): boolean { return this.running && !this.paused; }
  get isPaused(): boolean { return this.paused; }
  get isComplete(): boolean { return this.remaining <= 0; }
  get timeRemaining(): number { return Math.max(0, this.remaining); }

  /** 1 = just started, 0 = complete */
  get ratio(): number { return Math.max(0, this.remaining / this.duration); }

  /** 0 = just started, 1 = complete */
  get progress(): number { return 1 - this.ratio; }

  /** Change the duration */
  setDuration(ms: number): this {
    this.duration = ms;
    return this;
  }

  /** Add time to the timer */
  extend(ms: number): this {
    this.remaining += ms;
    return this;
  }

  /** Create a repeating timer */
  static repeating(durationMs: number, onComplete: () => void): GameTimer {
    const timer = new GameTimer(durationMs);
    timer.onComplete(() => {
      onComplete();
      timer.start(); // Auto-restart
    });
    return timer;
  }

  /** Create a countdown that fires onTick every second */
  static countdown(seconds: number, onTick: (secsLeft: number) => void, onComplete: () => void): GameTimer {
    let lastSec = seconds;
    const timer = new GameTimer(seconds * 1000);
    timer.onTick((remaining) => {
      const sec = Math.ceil(remaining / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        onTick(sec);
      }
    });
    timer.onComplete(onComplete);
    return timer;
  }
}
