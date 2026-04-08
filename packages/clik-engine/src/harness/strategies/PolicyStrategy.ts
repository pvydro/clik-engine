import type { ScenarioContext, ScenarioStrategy } from '../Scenario';

export type PolicyFn = (ctx: ScenarioContext) => Record<string, boolean> | Promise<Record<string, boolean>>;

/**
 * Calls an arbitrary (possibly async) function each frame to choose actions.
 *
 * The runner awaits the policy, so this can do anything from a simple
 * decision-tree based on `ctx.snapshot()` to an external HTTP/`preview_eval`
 * call where Claude reads scene state and replies with an action set.
 *
 * The returned record is applied as a *full* action state — actions absent
 * from the record are released. Use `Object.assign` over `ctx.snapshot()`'s
 * action keys if you want partial updates.
 */
export class PolicyStrategy implements ScenarioStrategy {
  constructor(private policy: PolicyFn) {}

  async beforeFrame(ctx: ScenarioContext): Promise<void> {
    const next = await this.policy(ctx);
    if (next) ctx.scripted.apply(next);
  }
}
