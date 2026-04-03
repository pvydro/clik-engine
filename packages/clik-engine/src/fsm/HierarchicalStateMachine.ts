import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { StateHooks } from './State';

export type HistoryMode = 'none' | 'shallow' | 'deep';

export interface HierarchicalStateConfig<TContext = unknown> {
  hooks?: StateHooks<TContext>;
  /** Tags for querying state properties (e.g., 'grounded', 'invincible') */
  tags?: string[];
  /** Child state machine (makes this a composite state) */
  children?: HierarchicalStateMachine<TContext>;
  /** Initial child state to enter when entering this composite state */
  initialChild?: string;
  /** How to re-enter children: 'none' = start from initial, 'shallow' = last child, 'deep' = full path */
  historyMode?: HistoryMode;
}

export interface EventTransitionDef<TContext = unknown> {
  to: string;
  guard?: (ctx: TContext, event: FSMEvent) => boolean;
}

export interface TimeoutTransitionDef {
  to: string;
  durationMs: number;
}

export interface FSMEvent {
  type: string;
  data?: unknown;
  /** Higher priority events are processed first */
  priority?: number;
}

/**
 * Hierarchical state machine with composite states, event-driven transitions,
 * timeout transitions, and state tags.
 *
 * Usage:
 * ```
 * const combat = new HierarchicalStateMachine(ctx, 'combat');
 * combat.addState('idle', { hooks: { ... } });
 * combat.addState('attacking', {
 *   tags: ['busy'],
 *   children: attackSubFSM,
 *   initialChild: 'windup',
 * });
 * combat.addEventTransition('idle', 'damage', { to: 'hitstun' });
 * combat.addTimeoutTransition('hitstun', { to: 'idle', durationMs: 500 });
 * ```
 */
export class HierarchicalStateMachine<TContext = unknown> {
  private states: Map<string, HierarchicalStateConfig<TContext>> = new Map();
  private eventTransitions: Map<string, Map<string, EventTransitionDef<TContext>[]>> = new Map();
  private timeoutTransitions: Map<string, TimeoutTransitionDef> = new Map();
  private conditionTransitions: Map<string, { to: string; condition: (ctx: TContext) => boolean; guard?: (ctx: TContext) => boolean }[]> = new Map();
  private currentState: string | null = null;
  private previousState: string | null = null;
  private context: TContext;
  private debugLabel: string;
  private history: string[] = [];
  private maxHistory = 10;
  private stateElapsed = 0;
  private lastChildState: Map<string, string> = new Map();
  private eventQueue: FSMEvent[] = [];

  constructor(context: TContext, debugLabel = 'hfsm') {
    this.context = context;
    this.debugLabel = debugLabel;
  }

  /** Add a state (optionally hierarchical with children) */
  addState(name: string, config: HierarchicalStateConfig<TContext>): this {
    this.states.set(name, config);
    return this;
  }

  /** Add a condition-based automatic transition */
  addTransition(from: string, to: string, condition: (ctx: TContext) => boolean, guard?: (ctx: TContext) => boolean): this {
    if (!this.conditionTransitions.has(from)) {
      this.conditionTransitions.set(from, []);
    }
    this.conditionTransitions.get(from)!.push({ to, condition, guard });
    return this;
  }

  /** Add an event-driven transition */
  addEventTransition(fromState: string, eventType: string, def: EventTransitionDef<TContext>): this {
    if (!this.eventTransitions.has(fromState)) {
      this.eventTransitions.set(fromState, new Map());
    }
    const stateMap = this.eventTransitions.get(fromState)!;
    if (!stateMap.has(eventType)) {
      stateMap.set(eventType, []);
    }
    stateMap.get(eventType)!.push(def);
    return this;
  }

  /** Add a timeout-based transition: auto-transition after durationMs in fromState */
  addTimeoutTransition(fromState: string, def: TimeoutTransitionDef): this {
    this.timeoutTransitions.set(fromState, def);
    return this;
  }

  /** Start the FSM */
  start(initialState: string): this {
    if (!this.states.has(initialState)) {
      ConsoleReporter.error(`HFSM '${this.debugLabel}': state '${initialState}' not found`);
      return this;
    }
    this.enterState(initialState, undefined);
    return this;
  }

  /** Update the FSM */
  update(delta: number): void {
    if (!this.currentState) return;

    // Process event queue
    this.processEvents();

    // Check timeout transitions
    this.stateElapsed += delta;
    const timeout = this.timeoutTransitions.get(this.currentState);
    if (timeout && this.stateElapsed >= timeout.durationMs) {
      this.transitionTo(timeout.to);
      return;
    }

    // Check condition transitions
    const rules = this.conditionTransitions.get(this.currentState);
    if (rules) {
      for (const rule of rules) {
        if (rule.condition(this.context)) {
          if (!rule.guard || rule.guard(this.context)) {
            this.transitionTo(rule.to);
            return;
          }
        }
      }
    }

    // Update current state hooks
    const config = this.states.get(this.currentState);
    config?.hooks?.update?.(this.context, delta);

    // Update child FSM if present
    config?.children?.update(delta);
  }

  /** Send an event to the FSM */
  sendEvent(event: FSMEvent): void {
    this.eventQueue.push(event);
    // Sort by priority (higher first)
    this.eventQueue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /** Force a transition */
  transitionTo(newState: string): boolean {
    if (!this.states.has(newState)) {
      ConsoleReporter.error(`HFSM '${this.debugLabel}': unknown state '${newState}'`);
      return false;
    }
    if (this.currentState === newState) return false;

    const oldState = this.currentState;
    this.exitState();
    this.enterState(newState, oldState ?? undefined);
    ConsoleReporter.state(`${this.debugLabel}: ${oldState} → ${newState}`);
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

  /** Get elapsed time in current state (ms) */
  getStateElapsed(): number {
    return this.stateElapsed;
  }

  is(state: string): boolean {
    return this.currentState === state;
  }

  isAny(...states: string[]): boolean {
    return this.currentState !== null && states.includes(this.currentState);
  }

  /** Check if current state (or any ancestor) has a tag */
  hasTag(tag: string): boolean {
    if (!this.currentState) return false;
    const config = this.states.get(this.currentState);
    if (!config) return false;
    if (config.tags?.includes(tag)) return true;
    // Check child FSM tags
    if (config.children) return config.children.hasTag(tag);
    return false;
  }

  /** Get all tags from current state and children */
  getTags(): string[] {
    if (!this.currentState) return [];
    const config = this.states.get(this.currentState);
    if (!config) return [];
    const tags = [...(config.tags ?? [])];
    if (config.children) tags.push(...config.children.getTags());
    return tags;
  }

  /** Get the active child state (if current state is composite) */
  getChildState(): string | null {
    if (!this.currentState) return null;
    const config = this.states.get(this.currentState);
    return config?.children?.getCurrent() ?? null;
  }

  /** Get full state path (e.g., 'combat.attacking.windup') */
  getStatePath(): string {
    if (!this.currentState) return '';
    const config = this.states.get(this.currentState);
    const childPath = config?.children?.getStatePath();
    return childPath ? `${this.currentState}.${childPath}` : this.currentState;
  }

  getDebugState(): Record<string, unknown> {
    return {
      current: this.currentState ?? 'none',
      previous: this.previousState ?? 'none',
      path: this.getStatePath(),
      tags: this.getTags(),
      elapsed: Math.round(this.stateElapsed),
    };
  }

  private enterState(name: string, prevState: string | undefined): void {
    this.previousState = this.currentState;
    this.currentState = name;
    this.stateElapsed = 0;
    this.history.push(name);
    if (this.history.length > this.maxHistory) this.history.shift();

    const config = this.states.get(name);
    config?.hooks?.enter?.(this.context, prevState);

    // Enter child FSM if composite
    if (config?.children && config.initialChild) {
      const historyMode = config.historyMode ?? 'none';
      const lastChild = this.lastChildState.get(name);

      if (historyMode !== 'none' && lastChild) {
        config.children.start(lastChild);
      } else {
        config.children.start(config.initialChild);
      }
    }
  }

  private exitState(): void {
    if (!this.currentState) return;
    const config = this.states.get(this.currentState);

    // Save child state for history
    if (config?.children) {
      const childState = config.children.getCurrent();
      if (childState) {
        this.lastChildState.set(this.currentState, childState);
      }
    }

    config?.hooks?.exit?.(this.context, undefined);
  }

  private processEvents(): void {
    if (this.eventQueue.length === 0 || !this.currentState) return;

    const events = [...this.eventQueue];
    this.eventQueue.length = 0;

    for (const event of events) {
      // First check if child FSM handles it
      const config = this.states.get(this.currentState!);
      if (config?.children) {
        const childHandled = this.tryChildEvent(config.children, event);
        if (childHandled) continue;
      }

      // Check event transitions for current state
      const stateEvents = this.eventTransitions.get(this.currentState!);
      if (!stateEvents) continue;

      const defs = stateEvents.get(event.type);
      if (!defs) continue;

      for (const def of defs) {
        if (!def.guard || def.guard(this.context, event)) {
          this.transitionTo(def.to);
          break;
        }
      }
    }
  }

  private tryChildEvent(child: HierarchicalStateMachine<TContext>, event: FSMEvent): boolean {
    // Check if child has an event transition for this event
    const childState = child.getCurrent();
    if (!childState) return false;

    const stateEvents = child.eventTransitions.get(childState);
    if (!stateEvents || !stateEvents.has(event.type)) return false;

    child.sendEvent(event);
    child.processEvents();
    return true;
  }
}
