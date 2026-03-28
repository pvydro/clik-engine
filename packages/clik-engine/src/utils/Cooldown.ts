/**
 * Simple cooldown tracker. Call `use()` to start cooldown,
 * check `isReady()` to see if it's available.
 * Update with delta each frame.
 */
export class Cooldown {
  private remaining = 0;
  private duration: number;

  constructor(durationMs: number) {
    this.duration = durationMs;
  }

  /** Try to use the cooldown. Returns true if it was ready. */
  use(): boolean {
    if (this.remaining > 0) return false;
    this.remaining = this.duration;
    return true;
  }

  /** Force the cooldown (even if not ready) */
  forceUse(): void {
    this.remaining = this.duration;
  }

  /** Reset cooldown to ready */
  reset(): void {
    this.remaining = 0;
  }

  /** Update with frame delta in ms */
  update(delta: number): void {
    if (this.remaining > 0) {
      this.remaining = Math.max(0, this.remaining - delta);
    }
  }

  get isReady(): boolean {
    return this.remaining <= 0;
  }

  get timeRemaining(): number {
    return this.remaining;
  }

  /** 0 = just used, 1 = ready */
  get progress(): number {
    if (this.duration === 0) return 1;
    return 1 - this.remaining / this.duration;
  }

  setDuration(ms: number): void {
    this.duration = ms;
  }
}
