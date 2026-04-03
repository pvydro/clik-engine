import type { HierarchicalStateMachine } from './HierarchicalStateMachine';
import type { AnimationStateMachine } from '../animation/AnimationStateMachine';

export interface AnimBindingConfig {
  /** FSM state name */
  fsmState: string;
  /** Animation state to play when entering this FSM state */
  animState: string;
  /** When animation completes, trigger this FSM transition (for non-looping anims) */
  onComplete?: string;
}

/**
 * Declarative two-way binding between a HierarchicalStateMachine and an AnimationStateMachine.
 *
 * Usage:
 * ```
 * const binding = new AnimationBinding(hfsm, asm);
 * binding.bind({ fsmState: 'idle', animState: 'idle' });
 * binding.bind({ fsmState: 'attack', animState: 'attack', onComplete: 'idle' });
 * // Call sync() after FSM transitions:
 * binding.sync();
 * ```
 */
export class AnimationBinding<TContext = unknown> {
  private fsm: HierarchicalStateMachine<TContext>;
  private asm: AnimationStateMachine;
  private bindings: Map<string, AnimBindingConfig> = new Map();
  private lastFsmState: string | null = null;

  constructor(fsm: HierarchicalStateMachine<TContext>, asm: AnimationStateMachine) {
    this.fsm = fsm;
    this.asm = asm;
  }

  /** Bind an FSM state to an animation state */
  bind(config: AnimBindingConfig): this {
    this.bindings.set(config.fsmState, config);
    return this;
  }

  /** Bind multiple at once */
  bindAll(configs: AnimBindingConfig[]): this {
    for (const config of configs) {
      this.bind(config);
    }
    return this;
  }

  /**
   * Sync animation to FSM state. Call this each frame or after FSM transitions.
   * Sets the animation state based on current FSM state.
   */
  sync(): void {
    const fsmState = this.fsm.getCurrent();
    if (!fsmState || fsmState === this.lastFsmState) return;

    this.lastFsmState = fsmState;
    const binding = this.bindings.get(fsmState);
    if (binding) {
      this.asm.setState(binding.animState);
    }
  }

  /**
   * Check if animation completed and should trigger FSM transition.
   * Call this each frame after sync().
   */
  checkAnimationComplete(): void {
    const fsmState = this.fsm.getCurrent();
    if (!fsmState) return;

    const binding = this.bindings.get(fsmState);
    if (!binding?.onComplete) return;

    // Check if animation is no longer in the expected state (completed and auto-transitioned)
    const currentAnim = this.asm.getCurrent();
    if (currentAnim !== binding.animState && currentAnim !== null) {
      this.fsm.transitionTo(binding.onComplete);
    }
  }

  /** Get the binding for an FSM state */
  getBinding(fsmState: string): AnimBindingConfig | undefined {
    return this.bindings.get(fsmState);
  }

  /** Get all bound FSM state names */
  getBoundStates(): string[] {
    return Array.from(this.bindings.keys());
  }

  /** Clear all bindings */
  clear(): void {
    this.bindings.clear();
    this.lastFsmState = null;
  }
}
