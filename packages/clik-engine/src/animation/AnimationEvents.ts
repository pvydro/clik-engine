import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface AnimationEventDef {
  /** Animation key */
  animKey: string;
  /** Frame index to trigger on */
  frame: number;
  /** Callback to fire */
  callback: () => void;
  /** Only fire once (default: every loop) */
  once?: boolean;
}

/**
 * System for triggering gameplay events on specific animation frames.
 * Useful for: attack hitbox timing, footstep sounds, VFX spawning.
 */
export class AnimationEventSystem {
  private scene: Phaser.Scene;
  private events: Map<string, AnimationEventDef[]> = new Map();
  private firedOnce: Set<string> = new Set();
  private boundSprites: Map<Phaser.GameObjects.Sprite, { update: Function; start: Function }> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Register an event on a specific animation frame */
  on(animKey: string, frame: number, callback: () => void, once = false): this {
    if (!this.events.has(animKey)) {
      this.events.set(animKey, []);
    }
    this.events.get(animKey)!.push({ animKey, frame, callback, once });
    return this;
  }

  /** Bind to a sprite — listens for animation frame updates */
  bind(sprite: Phaser.GameObjects.Sprite): this {
    const updateHandler = (
      anim: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame,
    ) => {
      const defs = this.events.get(anim.key);
      if (!defs) return;

      for (const def of defs) {
        if (frame.index === def.frame) {
          const onceKey = `${anim.key}_${def.frame}`;
          if (def.once && this.firedOnce.has(onceKey)) continue;

          def.callback();
          if (def.once) this.firedOnce.add(onceKey);
        }
      }
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, updateHandler);

    // Reset once-tracking on animation restart
    const startHandler = (anim: Phaser.Animations.Animation) => {
      // Clear once-fired flags for this animation
      for (const key of this.firedOnce) {
        if (key.startsWith(`${anim.key}_`)) {
          this.firedOnce.delete(key);
        }
      }
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_START, startHandler);

    this.boundSprites.set(sprite, { update: updateHandler, start: startHandler });
    return this;
  }

  /** Unbind from a sprite — removes animation listeners */
  unbind(sprite: Phaser.GameObjects.Sprite): this {
    const handlers = this.boundSprites.get(sprite);
    if (handlers) {
      sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, handlers.update as (...args: unknown[]) => void);
      sprite.off(Phaser.Animations.Events.ANIMATION_START, handlers.start as (...args: unknown[]) => void);
      this.boundSprites.delete(sprite);
    }
    return this;
  }

  /** Remove all events for an animation */
  clear(animKey: string): this {
    this.events.delete(animKey);
    return this;
  }

  /** Remove all events and unbind all sprites */
  clearAll(): void {
    for (const [sprite, handlers] of this.boundSprites) {
      sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE, handlers.update as (...args: unknown[]) => void);
      sprite.off(Phaser.Animations.Events.ANIMATION_START, handlers.start as (...args: unknown[]) => void);
    }
    this.boundSprites.clear();
    this.events.clear();
    this.firedOnce.clear();
  }

  /** Common pattern: play sound on frame */
  onSound(animKey: string, frame: number, soundKey: string, volume = 1): this {
    return this.on(animKey, frame, () => {
      this.scene.sound.play(soundKey, { volume });
    });
  }

  /** Common pattern: spawn particles on frame */
  onParticles(animKey: string, frame: number, emitterCallback: () => void): this {
    return this.on(animKey, frame, emitterCallback);
  }

  /** Common pattern: screen shake on frame */
  onShake(animKey: string, frame: number, duration = 100, intensity = 0.005): this {
    return this.on(animKey, frame, () => {
      this.scene.cameras.main.shake(duration, intensity);
    });
  }
}
