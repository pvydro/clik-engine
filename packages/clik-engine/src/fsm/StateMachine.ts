import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { StateHooks, TransitionRule } from './State';

export class StateMachine<TContext = unknown> {
  private states: Map<string, StateHooks<TContext>> = new Map();
  private transitions: Map<string, TransitionRule<TContext>[]> = new Map();
  private currentState: string | null = null;
  private previousState: string | null = null;
  private context: TContext;
  private debugLabel: string;
  private history: string[] = [];
  private maxHistory = 10;

  constructor(context: TContext, debugLabel = 'fsm') {
    this.context = context;
    this.debugLabel = debugLabel;
  }

  addState(name: string, hooks: StateHooks<TContext>): this {
    this.states.set(name, hooks);
    return this;
  }

  addTransition(from: string, to: string, condition: (ctx: TContext) => boolean, guard?: (ctx: TContext) => boolean): this {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, []);
    }
    this.transitions.get(from)!.push({ to, condition, guard });
    return this;
  }

  start(initialState: string): this {
    if (!this.states.has(initialState)) {
      ConsoleReporter.error(
        `FSM '${this.debugLabel}': state '${initialState}' not found`,
        `Available states: ${Array.from(this.states.keys()).join(', ')}`
      );
      return this;
    }

    this.currentState = initialState;
    this.history.push(initialState);
    this.states.get(initialState)?.enter?.(this.context, undefined);
    ConsoleReporter.state(`${this.debugLabel}.state = ${initialState}`);
    return this;
  }

  update(delta: number): void {
    if (!this.currentState) return;

    // Check automatic transitions
    const rules = this.transitions.get(this.currentState);
    if (rules) {
      for (const rule of rules) {
        if (rule.condition(this.context)) {
          if (!rule.guard || rule.guard(this.context)) {
            this.transitionTo(rule.to);
            return; // Don't update after transitioning
          }
        }
      }
    }

    // Update current state
    this.states.get(this.currentState)?.update?.(this.context, delta);
  }

  transitionTo(newState: string): boolean {
    if (!this.states.has(newState)) {
      ConsoleReporter.error(
        `FSM '${this.debugLabel}': cannot transition to unknown state '${newState}'`,
        `Available states: ${Array.from(this.states.keys()).join(', ')}`
      );
      return false;
    }

    if (this.currentState === newState) return false;

    const oldState = this.currentState;
    this.states.get(this.currentState!)?.exit?.(this.context, newState);

    this.previousState = this.currentState;
    this.currentState = newState;
    this.history.push(newState);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.states.get(newState)?.enter?.(this.context, oldState ?? undefined);
    ConsoleReporter.state(`${this.debugLabel}.state: ${oldState} → ${newState}`);
    return true;
  }

  getCurrent(): string | null {
    return this.currentState;
  }

  getPrevious(): string | null {
    return this.previousState;
  }

  getHistory(): readonly string[] {
    return this.history;
  }

  is(state: string): boolean {
    return this.currentState === state;
  }

  isAny(...states: string[]): boolean {
    return this.currentState !== null && states.includes(this.currentState);
  }

  /** Get debug info for StateInspector */
  getDebugState(): Record<string, unknown> {
    return {
      current: this.currentState ?? 'none',
      previous: this.previousState ?? 'none',
    };
  }
}
