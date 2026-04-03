import Phaser from 'phaser';

export type TransitionType = 'cut' | 'crossfade';

export interface AnimStateConfig {
  /** Animation key to play on entry */
  animKey: string;
  /** Whether the animation loops */
  loop?: boolean;
  /** Priority level: higher priority states can't be cancelled by lower ones */
  priority?: number;
  /** Frame after which this state can be cancelled into another */
  cancelAfterFrame?: number;
  /** If set, auto-transition to this state when animation completes */
  next?: string;
}

export interface AnimTransitionConfig {
  /** How to transition: instant cut or crossfade */
  type?: TransitionType;
  /** Duration of crossfade in ms (only for 'crossfade' type) */
  duration?: number;
}

/**
 * Animation-specific state machine with cancel windows, priority levels,
 * and per-edge transition types.
 *
 * Usage:
 * ```
 * const asm = new AnimationStateMachine(sprite);
 * asm.addState('idle', { animKey: 'player_idle', loop: true, priority: 0 });
 * asm.addState('attack', { animKey: 'player_attack', priority: 2, cancelAfterFrame: 4, next: 'idle' });
 * asm.addTransition('idle', 'attack', { type: 'cut' });
 * asm.start('idle');
 * ```
 */
export class AnimationStateMachine {
  private sprite: Phaser.GameObjects.Sprite;
  private states: Map<string, AnimStateConfig> = new Map();
  private transitions: Map<string, AnimTransitionConfig> = new Map();
  private currentState: string | null = null;
  private currentFrame = 0;
  private frameListener: ((anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => void) | null = null;
  private completeListener: (() => void) | null = null;

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite;
  }

  /** Register an animation state */
  addState(name: string, config: AnimStateConfig): this {
    this.states.set(name, {
      loop: true,
      priority: 0,
      cancelAfterFrame: 0,
      ...config,
    });
    return this;
  }

  /** Register a transition between two states */
  addTransition(from: string, to: string, config?: AnimTransitionConfig): this {
    this.transitions.set(`${from}->${to}`, { type: 'cut', duration: 200, ...config });
    return this;
  }

  /** Start the state machine in a given state */
  start(stateName: string): void {
    this.enterState(stateName);
  }

  /**
   * Request a state change. Respects priority levels and cancel windows.
   * Returns true if the transition was accepted.
   */
  setState(name: string): boolean {
    if (!this.states.has(name)) return false;
    if (this.currentState === name) return false;

    const current = this.currentState ? this.states.get(this.currentState) : null;
    const target = this.states.get(name)!;

    // Check priority: can't cancel into lower or equal priority unless cancellable
    if (current) {
      const canCancel = this.currentFrame >= (current.cancelAfterFrame ?? 0);
      if (!canCancel && target.priority! <= current.priority!) {
        return false;
      }
      // Higher priority always overrides
      if (target.priority! < current.priority! && !canCancel) {
        return false;
      }
    }

    this.enterState(name);
    return true;
  }

  /** Force a state change, ignoring priority and cancel windows */
  forceState(name: string): void {
    if (!this.states.has(name)) return;
    this.enterState(name);
  }

  /** Get the current state name */
  getCurrent(): string | null {
    return this.currentState;
  }

  /** Get the current animation frame index */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /** Check if the current state can be cancelled right now */
  canCancel(): boolean {
    if (!this.currentState) return true;
    const config = this.states.get(this.currentState);
    if (!config) return true;
    return this.currentFrame >= (config.cancelAfterFrame ?? 0);
  }

  /** Check if a transition from current state to target is allowed */
  canTransitionTo(target: string): boolean {
    if (!this.states.has(target)) return false;
    if (this.currentState === target) return false;

    const current = this.currentState ? this.states.get(this.currentState) : null;
    const targetConfig = this.states.get(target)!;

    if (current) {
      const canCancel = this.currentFrame >= (current.cancelAfterFrame ?? 0);
      if (!canCancel && targetConfig.priority! <= current.priority!) {
        return false;
      }
    }

    return true;
  }

  /** Get the config for a state */
  getStateConfig(name: string): AnimStateConfig | undefined {
    return this.states.get(name);
  }

  /** Clean up listeners */
  destroy(): void {
    this.removeListeners();
    this.states.clear();
    this.transitions.clear();
    this.currentState = null;
  }

  private enterState(name: string): void {
    const config = this.states.get(name);
    if (!config) return;

    const prevState = this.currentState;
    this.removeListeners();
    this.currentState = name;
    this.currentFrame = 0;

    // Determine transition type
    const transKey = prevState ? `${prevState}->${name}` : null;
    const trans = transKey ? this.transitions.get(transKey) : null;

    // Play the animation
    if (trans?.type === 'crossfade' && prevState) {
      // Simple crossfade: play new and let Phaser handle it
      this.sprite.play({ key: config.animKey, repeat: config.loop ? -1 : 0 });
    } else {
      this.sprite.play({ key: config.animKey, repeat: config.loop ? -1 : 0 });
    }

    // Track frame updates
    this.frameListener = (_anim, frame) => {
      this.currentFrame = frame.index;
    };
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.frameListener);

    // Handle animation completion for non-looping states
    if (!config.loop) {
      this.completeListener = () => {
        if (config.next && this.currentState === name) {
          this.enterState(config.next);
        }
      };
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, this.completeListener);
    }
  }

  private removeListeners(): void {
    if (this.frameListener) {
      this.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.frameListener);
      this.frameListener = null;
    }
    if (this.completeListener) {
      this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.completeListener);
      this.completeListener = null;
    }
  }
}
