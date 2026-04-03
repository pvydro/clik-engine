/**
 * Utility AI system: scores actions by consideration curves and picks the best.
 *
 * Usage:
 * ```
 * const ai = new UtilityAI<EnemyContext>();
 * ai.addAction('attack', [
 *   { name: 'closeEnough', curve: 'linear', inputFn: ctx => 1 - ctx.distance / 200 },
 *   { name: 'hasAmmo', curve: 'binary', inputFn: ctx => ctx.ammo > 0 ? 1 : 0 },
 * ]);
 * ai.addAction('flee', [
 *   { name: 'lowHealth', curve: 'quadratic', inputFn: ctx => 1 - ctx.health / 100 },
 * ]);
 * const best = ai.evaluate(context); // → 'attack' or 'flee'
 * ```
 */

export type CurveType = 'linear' | 'quadratic' | 'inverse' | 'binary' | 'logistic';

export interface Consideration<TContext> {
  name: string;
  /** Input function: returns 0-1 value from context */
  inputFn: (ctx: TContext) => number;
  /** Response curve type */
  curve?: CurveType;
  /** Weight multiplier for this consideration */
  weight?: number;
}

export interface ActionScore {
  action: string;
  score: number;
}

export class UtilityAI<TContext = unknown> {
  private actions: Map<string, Consideration<TContext>[]> = new Map();

  /** Register an action with its considerations */
  addAction(name: string, considerations: Consideration<TContext>[]): this {
    this.actions.set(name, considerations);
    return this;
  }

  /** Remove an action */
  removeAction(name: string): this {
    this.actions.delete(name);
    return this;
  }

  /** Evaluate all actions and return the best one */
  evaluate(context: TContext): string | null {
    const scores = this.scoreAll(context);
    if (scores.length === 0) return null;
    return scores[0].action;
  }

  /** Score all actions, sorted by score (highest first) */
  scoreAll(context: TContext): ActionScore[] {
    const scores: ActionScore[] = [];

    for (const [name, considerations] of this.actions) {
      let score = 1;
      for (const c of considerations) {
        const raw = Math.max(0, Math.min(1, c.inputFn(context)));
        const curved = applyCurve(raw, c.curve ?? 'linear');
        score *= curved * (c.weight ?? 1);
      }
      // Compensation factor: normalize by number of considerations
      if (considerations.length > 0) {
        score = Math.pow(score, 1 / considerations.length);
      }
      scores.push({ action: name, score });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  /** Get all registered action names */
  getActionNames(): string[] {
    return Array.from(this.actions.keys());
  }

  /** Clear all actions */
  clear(): void {
    this.actions.clear();
  }
}

function applyCurve(t: number, curve: CurveType): number {
  switch (curve) {
    case 'linear': return t;
    case 'quadratic': return t * t;
    case 'inverse': return 1 - t;
    case 'binary': return t >= 0.5 ? 1 : 0;
    case 'logistic': return 1 / (1 + Math.exp(-10 * (t - 0.5)));
    default: return t;
  }
}
