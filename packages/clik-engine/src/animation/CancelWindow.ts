/**
 * Defines frame ranges where an animation state can be cancelled.
 *
 * Usage:
 * ```
 * const cancel = new CancelWindow();
 * cancel.define('attack1', { start: 8, end: 15, into: ['attack2', 'dodge'] });
 * cancel.define('attack1', { start: 4, end: 15, into: ['special'] }); // special can cancel earlier
 *
 * cancel.canCancel('attack1', 'attack2', 10); // true (frame 10 is in [8, 15])
 * cancel.canCancel('attack1', 'attack2', 3);  // false (frame 3 is before window)
 * ```
 */

export interface CancelWindowDef {
  /** First frame where cancelling is allowed */
  start: number;
  /** Last frame where cancelling is allowed */
  end: number;
  /** States that can be cancelled into during this window */
  into: string[];
}

export class CancelWindow {
  private windows: Map<string, CancelWindowDef[]> = new Map();

  /** Define a cancel window for a state */
  define(state: string, window: CancelWindowDef): this {
    if (!this.windows.has(state)) {
      this.windows.set(state, []);
    }
    this.windows.get(state)!.push(window);
    return this;
  }

  /** Check if a cancel from `fromState` into `toState` is allowed at `currentFrame` */
  canCancel(fromState: string, toState: string, currentFrame: number): boolean {
    const defs = this.windows.get(fromState);
    if (!defs) return false;

    for (const def of defs) {
      if (currentFrame >= def.start && currentFrame <= def.end) {
        if (def.into.includes(toState)) return true;
      }
    }
    return false;
  }

  /** Get all valid cancel targets for a state at a given frame */
  getValidTargets(state: string, currentFrame: number): string[] {
    const defs = this.windows.get(state);
    if (!defs) return [];

    const targets = new Set<string>();
    for (const def of defs) {
      if (currentFrame >= def.start && currentFrame <= def.end) {
        for (const t of def.into) targets.add(t);
      }
    }
    return Array.from(targets);
  }

  /** Get all cancel window definitions for a state */
  getWindows(state: string): readonly CancelWindowDef[] {
    return this.windows.get(state) ?? [];
  }

  /** Check if any cancel window is active for a state at a frame */
  isInCancelWindow(state: string, currentFrame: number): boolean {
    const defs = this.windows.get(state);
    if (!defs) return false;
    return defs.some(def => currentFrame >= def.start && currentFrame <= def.end);
  }

  /** Clear all windows */
  clear(): void {
    this.windows.clear();
  }
}
