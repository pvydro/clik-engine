import Phaser from 'phaser';
import { Component } from '../Component';
import { AnimationStateMachine } from '../../animation/AnimationStateMachine';
import type { AnimStateConfig, AnimTransitionConfig } from '../../animation/AnimationStateMachine';

/**
 * Entity component wrapping AnimationStateMachine.
 * Provides a sprite and animation state machine on an entity.
 *
 * Usage:
 * ```
 * const animator = new AnimatorComponent(sprite);
 * animator.addState('idle', { animKey: 'player_idle', loop: true, priority: 0 });
 * animator.addState('run', { animKey: 'player_run', loop: true, priority: 1 });
 * entity.addComponent('animator', animator);
 * animator.start('idle');
 * ```
 */
export class AnimatorComponent extends Component {
  private asm: AnimationStateMachine;
  private sprite: Phaser.GameObjects.Sprite;

  constructor(sprite: Phaser.GameObjects.Sprite) {
    super();
    this.sprite = sprite;
    this.asm = new AnimationStateMachine(sprite);
  }

  /** Add an animation state */
  addState(name: string, config: AnimStateConfig): this {
    this.asm.addState(name, config);
    return this;
  }

  /** Add a transition between states */
  addTransition(from: string, to: string, config?: AnimTransitionConfig): this {
    this.asm.addTransition(from, to, config);
    return this;
  }

  /** Start the animation state machine */
  start(stateName: string): void {
    this.asm.start(stateName);
  }

  /** Request a state change (respects priority and cancel windows) */
  setState(name: string): boolean {
    return this.asm.setState(name);
  }

  /** Force a state change */
  forceState(name: string): void {
    this.asm.forceState(name);
  }

  /** Get the current state name */
  getCurrent(): string | null {
    return this.asm.getCurrent();
  }

  /** Get current frame index */
  getCurrentFrame(): number {
    return this.asm.getCurrentFrame();
  }

  /** Check if current state can be cancelled */
  canCancel(): boolean {
    return this.asm.canCancel();
  }

  /** Check if transition to target is possible */
  canTransitionTo(target: string): boolean {
    return this.asm.canTransitionTo(target);
  }

  /** Get the underlying AnimationStateMachine */
  getStateMachine(): AnimationStateMachine {
    return this.asm;
  }

  /** Get the sprite */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  reset(): void {
    // Reset to no state — caller should start() again after pool acquire
  }

  onDetach(): void {
    this.asm.destroy();
  }
}
