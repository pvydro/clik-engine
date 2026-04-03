import type { AnimationStateMachine } from '../animation/AnimationStateMachine';

export interface AIAnimMapping {
  /** AI action/state name */
  aiState: string;
  /** Animation state to play */
  animState: string;
}

/**
 * Maps AI actions/states to animation states.
 * Bridges behavior trees, GOAP plans, or utility AI with the animation system.
 *
 * Usage:
 * ```
 * const adapter = new AIAnimationAdapter(animStateMachine);
 * adapter.map('patrol', 'walk');
 * adapter.map('attack', 'attack');
 * adapter.map('idle', 'idle');
 *
 * // When AI decides an action:
 * adapter.setAIState('patrol'); // plays 'walk' animation
 * ```
 */
export class AIAnimationAdapter {
  private asm: AnimationStateMachine;
  private mappings: Map<string, string> = new Map();
  private currentAIState: string | null = null;
  private velocityBlendCallback: ((vx: number, vy: number) => string | null) | null = null;

  constructor(asm: AnimationStateMachine) {
    this.asm = asm;
  }

  /** Map an AI state to an animation state */
  map(aiState: string, animState: string): this {
    this.mappings.set(aiState, animState);
    return this;
  }

  /** Map multiple at once */
  mapAll(mappings: AIAnimMapping[]): this {
    for (const m of mappings) this.mappings.set(m.aiState, m.animState);
    return this;
  }

  /** Set the current AI state — triggers animation change if mapped */
  setAIState(state: string): boolean {
    if (state === this.currentAIState) return false;
    this.currentAIState = state;

    const animState = this.mappings.get(state);
    if (animState) {
      return this.asm.setState(animState);
    }
    return false;
  }

  /**
   * Set a callback that maps velocity to animation state.
   * Called by updateFromVelocity() to drive blend-tree-like behavior.
   */
  setVelocityBlend(callback: (vx: number, vy: number) => string | null): this {
    this.velocityBlendCallback = callback;
    return this;
  }

  /**
   * Update animation based on entity velocity.
   * Uses the velocity blend callback if set.
   */
  updateFromVelocity(vx: number, vy: number): boolean {
    if (!this.velocityBlendCallback) return false;
    const animState = this.velocityBlendCallback(vx, vy);
    if (animState) {
      return this.asm.setState(animState);
    }
    return false;
  }

  /** Get the mapped animation for an AI state */
  getAnimForAIState(state: string): string | undefined {
    return this.mappings.get(state);
  }

  /** Get current AI state */
  getCurrentAIState(): string | null {
    return this.currentAIState;
  }

  /** Get all mapping entries */
  getMappings(): readonly AIAnimMapping[] {
    return Array.from(this.mappings.entries()).map(([aiState, animState]) => ({ aiState, animState }));
  }

  /** Clear all mappings */
  clear(): void {
    this.mappings.clear();
    this.currentAIState = null;
    this.velocityBlendCallback = null;
  }
}
