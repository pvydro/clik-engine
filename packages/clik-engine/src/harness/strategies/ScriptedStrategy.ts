import type { ScenarioContext, ScenarioStrategy } from '../Scenario';

export interface ScriptStep {
  /** Frame number on which to apply this step (0-indexed against the runner). */
  frame: number;
  /** Action name from the InputConfig. */
  action: string;
  /** True to press, false to release. */
  value: boolean;
}

/**
 * Replays a deterministic script of input changes against a runner. Useful for
 * automated regression-style tests where the same input timeline must reproduce
 * the same outcome across many seeds.
 *
 * Steps may be supplied unsorted; the strategy sorts and consumes them in
 * order.
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
