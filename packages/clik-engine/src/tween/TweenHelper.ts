import type Phaser from 'phaser';
import type { EaseName } from './easings';
import type { TweenableLike, PositionLike } from '../utils/interfaces';

export interface TweenConfig {
  duration?: number;
  ease?: EaseName | string;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
}

/**
 * Promise-based tween wrapper. Resolves when the tween completes.
 */
export function tween(
  scene: Phaser.Scene,
  targets: object | object[],
  props: Record<string, number>,
  config?: TweenConfig
): Promise<void> {
  return new Promise(resolve => {
    scene.tweens.add({
      targets,
      ...props,
      duration: config?.duration ?? 300,
      ease: config?.ease ?? 'Linear',
      delay: config?.delay ?? 0,
      repeat: config?.repeat ?? 0,
      yoyo: config?.yoyo ?? false,
      onComplete: () => resolve(),
    });
  });
}

/**
 * Chain multiple tweens in sequence.
 */
export async function tweenSequence(
  scene: Phaser.Scene,
  targets: object | object[],
  steps: Array<{ props: Record<string, number>; config?: TweenConfig }>
): Promise<void> {
  for (const step of steps) {
    await tween(scene, targets, step.props, step.config);
  }
}

/** Common tween presets */
export const TweenPresets = {
  /** Pop in from scale 0 → 1 */
  popIn(scene: Phaser.Scene, target: TweenableLike, duration = 300): Promise<void> {
    target.scaleX = 0;
    target.scaleY = 0;
    return tween(scene, target, { scaleX: 1, scaleY: 1 }, { duration, ease: 'Back.easeOut' });
  },

  /** Shake horizontally */
  shake(scene: Phaser.Scene, target: PositionLike, intensity = 5, duration = 200): Promise<void> {
    const original = target.x;
    return new Promise(resolve => {
      scene.tweens.add({
        targets: target,
        x: original + intensity,
        duration: duration / 6,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          target.x = original;
          resolve();
        },
      });
    });
  },

  /** Pulse scale up and down */
  pulse(scene: Phaser.Scene, target: TweenableLike, scale = 1.15, duration = 400): Promise<void> {
    return tween(scene, target, { scaleX: scale, scaleY: scale }, {
      duration: duration / 2, ease: 'Sine.easeInOut', yoyo: true,
    });
  },

  /** Fade in from alpha 0 → 1 */
  fadeIn(scene: Phaser.Scene, target: { alpha: number }, duration = 300): Promise<void> {
    target.alpha = 0;
    return tween(scene, target, { alpha: 1 }, { duration });
  },

  /** Fade out from alpha 1 → 0 */
  fadeOut(scene: Phaser.Scene, target: { alpha: number }, duration = 300): Promise<void> {
    return tween(scene, target, { alpha: 0 }, { duration });
  },

  /** Float up and down continuously */
  float(scene: Phaser.Scene, target: PositionLike, amplitude = 8, duration = 2000): Phaser.Tweens.Tween {
    const baseY = target.y;
    return scene.tweens.add({
      targets: target,
      y: baseY - amplitude,
      duration: duration / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  },

  /** Bounce in from above */
  bounceIn(scene: Phaser.Scene, target: PositionLike, fromY: number, duration = 500): Promise<void> {
    const targetY = target.y;
    target.y = fromY;
    return tween(scene, target, { y: targetY }, { duration, ease: 'Bounce.easeOut' });
  },
};
