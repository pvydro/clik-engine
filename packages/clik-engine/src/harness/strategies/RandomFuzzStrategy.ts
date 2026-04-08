import type { ScenarioContext, ScenarioStrategy } from '../Scenario';

export interface FuzzOpts {
  /** Action names to fuzz. Required — the strategy doesn't reach into the action map. */
  actions: string[];
  /** Probability per frame that any given action toggles. Default 0.15. */
  toggleChance?: number;
  /** When true, releases all actions on the first frame for a clean baseline. */
  resetOnInit?: boolean;
}

/**
 * Picks random actions to press/release each frame, using the runner's seeded
 * RNG so each instance reproduces its inputs from its seed.
 *
 * Used for stability fuzzing: smash inputs and watch for crashes / unhandled
 * errors. Each instance with seed N will always produce the same input stream.
 */
export class RandomFuzzStrategy implements ScenarioStrategy {
  private actions: string[];
  private toggleChance: number;
  private resetOnInit: boolean;
  private state: Map<string, boolean> = new Map();

  constructor(opts: FuzzOpts) {
    this.actions = [...opts.actions];
    this.toggleChance = opts.toggleChance ?? 0.15;
    this.resetOnInit = opts.resetOnInit ?? true;
  }

  init(ctx: ScenarioContext): void {
    this.state.clear();
    if (this.resetOnInit) {
      for (const action of this.actions) {
        ctx.scripted.set(action, false);
        this.state.set(action, false);
      }
    }
  }

  beforeFrame(ctx: ScenarioContext): void {
    for (const action of this.actions) {
      if (ctx.random.next() < this.toggleChance) {
        const next = !(this.state.get(action) ?? false);
        this.state.set(action, next);
        ctx.scripted.set(action, next);
      }
    }
  }
}
