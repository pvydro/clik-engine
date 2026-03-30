import Phaser from 'phaser';
import type { TweenableLike } from '../utils/interfaces';
import type { A11yManager } from '../accessibility/A11yManager';

export type UIAnimationType = 'fadeIn' | 'fadeOut' | 'slideInLeft' | 'slideInRight' | 'slideInUp' | 'slideInDown' | 'scaleIn' | 'scaleOut' | 'bounceIn';

export interface UIAnimationConfig {
  duration?: number;
  ease?: string;
  delay?: number;
}

/** Check if reduced motion is active via A11yManager in the game registry */
function shouldReduceMotion(scene: Phaser.Scene): boolean {
  try {
    const a11y = scene.game?.registry?.get('__clikA11y') as A11yManager | undefined;
    return a11y?.isReducedMotion() ?? false;
  } catch {
    return false;
  }
}

export class UIAnimator {
  static animate(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    type: UIAnimationType,
    config?: UIAnimationConfig,
  ): Promise<void> {
    const go = target as unknown as TweenableLike;

    // Reduced motion: apply final state instantly, skip tweens
    if (shouldReduceMotion(scene)) {
      UIAnimator.applyFinalState(go, type);
      return Promise.resolve();
    }

    const duration = config?.duration ?? 300;
    const ease = config?.ease ?? 'Cubic.easeOut';
    const delay = config?.delay ?? 0;

    return new Promise(resolve => {
      switch (type) {
        case 'fadeIn':
          go.alpha = 0;
          scene.tweens.add({ targets: target, alpha: 1, duration, ease, delay, onComplete: () => resolve() });
          break;

        case 'fadeOut':
          scene.tweens.add({ targets: target, alpha: 0, duration, ease, delay, onComplete: () => resolve() });
          break;

        case 'slideInLeft': {
          const origX = go.x;
          go.x = origX - 100;
          go.alpha = 0;
          scene.tweens.add({ targets: target, x: origX, alpha: 1, duration, ease, delay, onComplete: () => resolve() });
          break;
        }

        case 'slideInRight': {
          const origX = go.x;
          go.x = origX + 100;
          go.alpha = 0;
          scene.tweens.add({ targets: target, x: origX, alpha: 1, duration, ease, delay, onComplete: () => resolve() });
          break;
        }

        case 'slideInUp': {
          const origY = go.y;
          go.y = origY + 60;
          go.alpha = 0;
          scene.tweens.add({ targets: target, y: origY, alpha: 1, duration, ease, delay, onComplete: () => resolve() });
          break;
        }

        case 'slideInDown': {
          const origY = go.y;
          go.y = origY - 60;
          go.alpha = 0;
          scene.tweens.add({ targets: target, y: origY, alpha: 1, duration, ease, delay, onComplete: () => resolve() });
          break;
        }

        case 'scaleIn':
          go.scaleX = 0;
          go.scaleY = 0;
          go.alpha = 0;
          scene.tweens.add({ targets: target, scaleX: 1, scaleY: 1, alpha: 1, duration, ease: 'Back.easeOut', delay, onComplete: () => resolve() });
          break;

        case 'scaleOut':
          scene.tweens.add({ targets: target, scaleX: 0, scaleY: 0, alpha: 0, duration, ease: 'Back.easeIn', delay, onComplete: () => resolve() });
          break;

        case 'bounceIn':
          go.scaleX = 0;
          go.scaleY = 0;
          scene.tweens.add({ targets: target, scaleX: 1, scaleY: 1, duration, ease: 'Bounce.easeOut', delay, onComplete: () => resolve() });
          break;

        default:
          resolve();
      }
    });
  }

  /**
   * Animate a list of items with staggered delay.
   */
  static stagger(
    scene: Phaser.Scene,
    targets: Phaser.GameObjects.GameObject[],
    type: UIAnimationType,
    staggerDelay = 50,
    config?: UIAnimationConfig,
  ): Promise<void[]> {
    return Promise.all(
      targets.map((target, i) =>
        UIAnimator.animate(scene, target, type, { ...config, delay: (config?.delay ?? 0) + i * staggerDelay })
      )
    );
  }

  /** Apply the final state of an animation instantly (for reduced motion) */
  private static applyFinalState(go: TweenableLike, type: UIAnimationType): void {
    switch (type) {
      case 'fadeIn':
        go.alpha = 1;
        break;
      case 'fadeOut':
        go.alpha = 0;
        break;
      case 'slideInLeft':
      case 'slideInRight':
      case 'slideInUp':
      case 'slideInDown':
        go.alpha = 1;
        break;
      case 'scaleIn':
      case 'bounceIn':
        go.scaleX = 1;
        go.scaleY = 1;
        go.alpha = 1;
        break;
      case 'scaleOut':
        go.scaleX = 0;
        go.scaleY = 0;
        go.alpha = 0;
        break;
    }
  }
}
