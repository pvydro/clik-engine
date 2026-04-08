import type { ScenarioContext, ScenarioStrategy } from '../Scenario';

/**
 * A policy function called by {@link PolicyStrategy} each frame to choose
 * actions. May be sync or async.
 *
 * @category Harness
 */
export type PolicyFn = (ctx: ScenarioContext) => Record<string, boolean> | Promise<Record<string, boolean>>;

/**
 * Calls a {@link PolicyFn} each frame to decide which actions to press.
 * Great for heuristic AI, external policy calls, or Claude-driven play.
 *
 * The runner awaits the policy, so it can do anything from a decision-tree
 * based on `ctx.snapshot()` to an external HTTP / `preview_eval` round-trip
 * where Claude reads scene state and replies with an action set.
 *
 * The returned record is applied as a *full* action state — actions absent
 * from the record are released. Read `ctx.snapshot()` if you want to
 * preserve current state and only flip some keys.
 *
 * @example Simple heuristic
 * ```ts
 * new PolicyStrategy(ctx => {
 *   const snap = ctx.snapshot() as any;
 *   return {
 *     left:  snap.main.enemyX < snap.main.playerX,
 *     right: snap.main.enemyX > snap.main.playerX,
 *     attack: Math.abs(snap.main.enemyX - snap.main.playerX) < 50,
 *   };
 * });
 * ```
 *
 * @category Harness
 */
export class PolicyStrategy implements ScenarioStrategy {
  constructor(private policy: PolicyFn) {}

  async beforeFrame(ctx: ScenarioContext): Promise<void> {
    const next = await this.policy(ctx);
    if (next) ctx.scripted.apply(next);
  }
}
