import type { ScenarioContext, ScenarioStrategy } from '../Scenario';

/**
 * One entry in a {@link ScriptedStrategy} timeline: press or release an
 * action on a specific frame.
 *
 * @category Harness
 */
export interface ScriptStep {
  /** Frame number on which to apply this step (0-indexed against the runner). */
  frame: number;
  /** Action name from the InputConfig. */
  action: string;
  /** True to press, false to release. */
  value: boolean;
}

/**
 * Replays a deterministic `{ frame, action, value }` timeline against a
 * {@link HeadlessRunner}. Perfect for reproducible regression tests where the
 * *inputs* stay identical while the *RNG seed* varies — drop a scripted run
 * into a `HarnessRunner.run({ seeds: { count: 100 } })` sweep to assert that
 * no seed breaks the scripted path.
 *
 * Steps may be supplied unsorted; the strategy sorts and consumes them in
 * frame order.
 *
 * @example
 * ```ts
 * new ScriptedStrategy([
 *   { frame: 30, action: 'jump',   value: true  },
 *   { frame: 32, action: 'jump',   value: false },
 *   { frame: 60, action: 'attack', value: true  },
 * ]);
 * ```
 *
 * @category Harness
 */
export class ScriptedStrategy implements ScenarioStrategy {
  private steps: ScriptStep[];
  private cursor = 0;

  constructor(steps: ScriptStep[]) {
    this.steps = [...steps].sort((a, b) => a.frame - b.frame);
  }

  init(_ctx: ScenarioContext): void {
    this.cursor = 0;
  }

  beforeFrame(ctx: ScenarioContext): void {
    while (this.cursor < this.steps.length && this.steps[this.cursor].frame <= ctx.frame) {
      const step = this.steps[this.cursor++];
      ctx.scripted.set(step.action, step.value);
    }
  }
}
