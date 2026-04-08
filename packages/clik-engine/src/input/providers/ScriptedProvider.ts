import type { InputProvider } from './InputProvider';

/**
 * Programmatic {@link InputProvider} — actions are driven by direct method
 * calls instead of real keyboard / touch / gamepad events.
 *
 * Used by the multi-instance test harness so scenarios can simulate inputs
 * without a DOM. Add to any `InputManager` via
 * `inputManager.addProvider(scripted)` — the whole pipeline (action map,
 * `InputBuffer`, combo detector, `BaseScene.actions`) works exactly as it
 * does for real input.
 *
 * Two modes:
 *  - `set(action, true|false)` — sticky: stays in that state until changed
 *  - `pulse(action, frames)` — held down for the next N polled frames
 *  - `apply(state)` — bulk set from a `{ action: boolean }` map
 *  - `clear()` — release everything
 *
 * @example
 * ```ts
 * const scripted = new ScriptedProvider();
 * inputManager.addProvider(scripted);
 * scripted.set('jump', true);
 * scripted.pulse('attack', 3);
 * ```
 *
 * @category Harness
 */
export class ScriptedProvider implements InputProvider {
  private sticky: Map<string, boolean> = new Map();
  private pulses: Map<string, number> = new Map();

  /** Set an action's held state. Pass true to press, false to release. */
  set(action: string, pressed: boolean): void {
    if (pressed) {
      this.sticky.set(action, true);
    } else {
      this.sticky.set(action, false);
    }
  }

  /** Hold an action down for the next `frames` polls (default 1). */
  pulse(action: string, frames = 1): void {
    if (frames <= 0) return;
    const existing = this.pulses.get(action) ?? 0;
    this.pulses.set(action, Math.max(existing, frames));
  }

  /** Release every action and cancel any in-flight pulses. */
  clear(): void {
    this.sticky.clear();
    this.pulses.clear();
  }

  /** Apply a flat snapshot of action states (true/false). Unlisted actions are unchanged. */
  apply(state: Record<string, boolean>): void {
    for (const [action, pressed] of Object.entries(state)) {
      this.set(action, pressed);
    }
  }

  update(): void {
    // Decrement pulse counters once per frame. We do this *after* polling
    // so the pulse remains visible during the same frame it was scheduled.
    if (this.pulses.size === 0) return;
    for (const [action, remaining] of this.pulses) {
      const next = remaining - 1;
      if (next <= 0) {
        this.pulses.delete(action);
      } else {
        this.pulses.set(action, next);
      }
    }
  }

  isActionDown(action: string): boolean {
    if (this.sticky.get(action)) return true;
    if ((this.pulses.get(action) ?? 0) > 0) return true;
    return false;
  }

  consumeAction(_action: string): boolean {
    return false;
  }

  destroy(): void {
    this.sticky.clear();
    this.pulses.clear();
  }
}
