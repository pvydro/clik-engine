import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface AnimationDef {
  key: string;
  atlas?: string;
  prefix?: string;
  /** Frame indices for spritesheet, or frame names for atlas */
  frames?: number[] | string[];
  /** Start/end frame indices for spritesheet */
  start?: number;
  end?: number;
  frameRate?: number;
  repeat?: number; // -1 = infinite
  yoyo?: boolean;
}

export interface AnimationSet {
  [name: string]: AnimationDef;
}

/**
 * Declarative animation registration and playback helper.
 * Wraps Phaser's animation system with a simpler API.
 */
export class AnimationHelper {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Register multiple animations from a definition set.
   * Typically called once in scene create().
   */
  register(animations: AnimationSet): void {
    for (const [name, def] of Object.entries(animations)) {
      if (this.scene.anims.exists(def.key)) continue;

      const config: Phaser.Types.Animations.Animation = {
        key: def.key,
        frameRate: def.frameRate ?? 10,
        repeat: def.repeat ?? -1,
        yoyo: def.yoyo ?? false,
      };

      if (def.atlas && def.prefix) {
        // Atlas-based: generate frame names
        config.frames = this.scene.anims.generateFrameNames(def.atlas, {
          prefix: def.prefix,
          start: def.start ?? 0,
          end: def.end ?? 0,
          zeroPad: 2,
        });
      } else if (def.atlas && def.frames && typeof def.frames[0] === 'string') {
        // Atlas with explicit frame names
        config.frames = (def.frames as string[]).map(f => ({ key: def.atlas!, frame: f }));
      } else if (def.frames && typeof def.frames[0] === 'number') {
        // Spritesheet with explicit frame indices
        config.frames = (def.frames as number[]).map(i => ({ key: def.key, frame: i }));
      } else if (def.start !== undefined && def.end !== undefined) {
        // Spritesheet with start/end range
        const textureKey = def.atlas ?? def.key;
        config.frames = this.scene.anims.generateFrameNumbers(textureKey, {
          start: def.start,
          end: def.end,
        });
      }

      this.scene.anims.create(config);
      ConsoleReporter.engine(`Animation registered: ${def.key}`);
    }
  }

  /**
   * Play an animation on a sprite. Returns a promise that resolves
   * when the animation completes (for non-looping animations).
   */
  play(
    sprite: Phaser.GameObjects.Sprite,
    key: string,
    ignoreIfPlaying = true
  ): Promise<void> {
    return new Promise(resolve => {
      sprite.play({ key, repeat: undefined }, ignoreIfPlaying);

      const anim = this.scene.anims.get(key);
      if (anim && anim.repeat === -1) {
        // Infinite loop — resolve immediately
        resolve();
      } else {
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => resolve());
      }
    });
  }

  /** Play animation and call a function on a specific frame */
  playWithCallback(
    sprite: Phaser.GameObjects.Sprite,
    key: string,
    frameIndex: number,
    callback: () => void
  ): void {
    sprite.play(key);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, (
      _anim: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame
    ) => {
      if (frame.index === frameIndex) {
        callback();
      }
    });
  }

  /** Stop animation on a sprite */
  stop(sprite: Phaser.GameObjects.Sprite): void {
    sprite.stop();
  }

  /** Check if a sprite is playing a specific animation */
  isPlaying(sprite: Phaser.GameObjects.Sprite, key?: string): boolean {
    if (!sprite.anims.isPlaying) return false;
    if (key) return sprite.anims.currentAnim?.key === key;
    return true;
  }

  /** Get the current animation key playing on a sprite */
  getCurrentKey(sprite: Phaser.GameObjects.Sprite): string | null {
    return sprite.anims.currentAnim?.key ?? null;
  }
}

/**
 * Animation state controller — maps FSM states to animations.
 * Use with StateMachine for automatic animation switching.
 */
export class AnimationStateController {
  private sprite: Phaser.GameObjects.Sprite;
  private stateMap: Map<string, string> = new Map();

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite;
  }

  /** Map a state name to an animation key */
  map(state: string, animKey: string): this {
    this.stateMap.set(state, animKey);
    return this;
  }

  /** Map multiple states at once */
  mapAll(mappings: Record<string, string>): this {
    for (const [state, anim] of Object.entries(mappings)) {
      this.stateMap.set(state, anim);
    }
    return this;
  }

  /** Call this when state changes to auto-play the mapped animation */
  onStateChange(newState: string): void {
    const animKey = this.stateMap.get(newState);
    if (animKey) {
      this.sprite.play(animKey, true);
    }
  }

  /** Get the animation key for a state */
  getAnimForState(state: string): string | undefined {
    return this.stateMap.get(state);
  }
}
