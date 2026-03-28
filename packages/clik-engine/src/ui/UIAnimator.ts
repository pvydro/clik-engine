import Phaser from 'phaser';

export type UIAnimationType = 'fadeIn' | 'fadeOut' | 'slideInLeft' | 'slideInRight' | 'slideInUp' | 'slideInDown' | 'scaleIn' | 'scaleOut' | 'bounceIn';

export interface UIAnimationConfig {
  duration?: number;
  ease?: string;
  delay?: number;
}

export class UIAnimator {
  static animate(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    type: UIAnimationType,
    config?: UIAnimationConfig,
  ): Promise<void> {
    const duration = config?.duration ?? 300;
    const ease = config?.ease ?? 'Cubic.easeOut';
    const delay = config?.delay ?? 0;
    const go = target as unknown as { alpha: number; x: number; y: number; scaleX: number; scaleY: number };

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
}
