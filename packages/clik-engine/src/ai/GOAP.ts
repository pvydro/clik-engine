/**
 * Goal-Oriented Action Planning (GOAP).
 * Entities define goals (desired world state) and available actions
 * (preconditions + effects). The planner uses A* to find optimal action sequences.
 *
 * Usage:
 * ```
 * const planner = new GOAPPlanner();
 * planner.addAction({
 *   name: 'pickUpWeapon',
 *   cost: 1,
 *   preconditions: { nearWeapon: true },
 *   effects: { hasWeapon: true },
 * });
 * planner.addAction({
 *   name: 'attack',
 *   cost: 1,
 *   preconditions: { hasWeapon: true, nearEnemy: true },
 *   effects: { enemyDead: true },
 * });
 *
 * const plan = planner.plan(
 *   { nearWeapon: true, nearEnemy: false, hasWeapon: false, enemyDead: false },
 *   { enemyDead: true },
 * );
 * // → ['pickUpWeapon', 'attack'] (or similar)
 * ```
 */

export type WorldState = Record<string, boolean | number>;

export interface GOAPAction {
  name: string;
  cost: number;
  preconditions: WorldState;
  effects: WorldState;
}

interface PlanNode {
  state: WorldState;
  action: string | null;
  parent: PlanNode | null;
  g: number;
  h: number;
  f: number;
}

export class GOAPPlanner {
  private actions: GOAPAction[] = [];

  /** Register an action */
  addAction(action: GOAPAction): this {
    this.actions.push(action);
    return this;
  }

  /** Remove an action by name */
  removeAction(name: string): this {
    this.actions = this.actions.filter(a => a.name !== name);
    return this;
  }

  /**
   * Plan a sequence of actions to reach the goal from the current world state.
   * Returns action names in execution order, or empty array if no plan found.
   */
  plan(currentState: WorldState, goal: WorldState, maxSteps = 20): string[] {
    const startNode: PlanNode = {
      state: { ...currentState },
      action: null,
      parent: null,
      g: 0,
      h: this.heuristic(currentState, goal),
      f: 0,
    };
    startNode.f = startNode.g + startNode.h;

    const open: PlanNode[] = [startNode];
    const closed = new Set<string>();

    while (open.length > 0) {
      // Get lowest f node
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;

      if (this.goalMet(current.state, goal)) {
        return this.reconstructPlan(current);
      }

      const stateKey = this.stateKey(current.state);
      if (closed.has(stateKey)) continue;
      closed.add(stateKey);

      if (current.g >= maxSteps) continue;

      // Try each action
      for (const action of this.actions) {
        if (!this.preconditionsMet(current.state, action.preconditions)) continue;

        const newState = this.applyEffects(current.state, action.effects);
        const newKey = this.stateKey(newState);
        if (closed.has(newKey)) continue;

        const g = current.g + action.cost;
        const h = this.heuristic(newState, goal);
        const node: PlanNode = {
          state: newState,
          action: action.name,
          parent: current,
          g, h, f: g + h,
        };

        open.push(node);
      }
    }

    return []; // No plan found
  }

  /** Get all registered actions */
  getActions(): readonly GOAPAction[] {
    return this.actions;
  }

  /** Clear all actions */
  clear(): void {
    this.actions = [];
  }

  private goalMet(state: WorldState, goal: WorldState): boolean {
    for (const [key, value] of Object.entries(goal)) {
      if (state[key] !== value) return false;
    }
    return true;
  }

  private preconditionsMet(state: WorldState, preconditions: WorldState): boolean {
    for (const [key, value] of Object.entries(preconditions)) {
      if (state[key] !== value) return false;
    }
    return true;
  }

  private applyEffects(state: WorldState, effects: WorldState): WorldState {
    return { ...state, ...effects };
  }

  private heuristic(state: WorldState, goal: WorldState): number {
    let unsatisfied = 0;
    for (const [key, value] of Object.entries(goal)) {
      if (state[key] !== value) unsatisfied++;
    }
    return unsatisfied;
  }

  private stateKey(state: WorldState): string {
    return Object.entries(state).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|');
  }

  private reconstructPlan(node: PlanNode): string[] {
    const plan: string[] = [];
    let current: PlanNode | null = node;
    while (current) {
      if (current.action) plan.unshift(current.action);
      current = current.parent;
    }
    return plan;
  }
}
