import type Phaser from 'phaser';

export interface TransitionConfig {
  duration: number;
  ease?: string;
  onStart?: (fromScene: Phaser.Scene, toScene: Phaser.Scene) => void;
  onProgress?: (progress: number, fromScene: Phaser.Scene, toScene: Phaser.Scene) => void;
  onComplete?: (fromScene: Phaser.Scene, toScene: Phaser.Scene) => void;
}

export const Transitions = {
  fade(duration = 500): TransitionConfig {
    return {
      duration,
      ease: 'Linear',
      onStart(_from, to) {
        to.cameras.main.setAlpha(0);
      },
      onProgress(progress, from, to) {
        from.cameras.main.setAlpha(1 - progress);
        to.cameras.main.setAlpha(progress);
      },
      onComplete(_from, to) {
        to.cameras.main.setAlpha(1);
      },
    };
  },

  slideLeft(duration = 400, ease = 'Cubic.easeInOut'): TransitionConfig {
    return {
      duration,
      ease,
      onStart(_from, to) {
        const w = to.scale.width;
        to.cameras.main.setScroll(w, 0);
      },
      onProgress(progress, from, to) {
        const w = from.scale.width;
        from.cameras.main.setScroll(-w * progress, 0);
        to.cameras.main.setScroll(w * (1 - progress), 0);
      },
      onComplete(_from, to) {
        to.cameras.main.setScroll(0, 0);
      },
    };
  },

  slideRight(duration = 400, ease = 'Cubic.easeInOut'): TransitionConfig {
    return {
      duration,
      ease,
      onStart(_from, to) {
        const w = to.scale.width;
        to.cameras.main.setScroll(-w, 0);
      },
      onProgress(progress, from, to) {
        const w = from.scale.width;
        from.cameras.main.setScroll(w * progress, 0);
        to.cameras.main.setScroll(-w * (1 - progress), 0);
      },
      onComplete(_from, to) {
        to.cameras.main.setScroll(0, 0);
      },
    };
  },

  slideUp(duration = 400, ease = 'Cubic.easeInOut'): TransitionConfig {
    return {
      duration,
      ease,
      onStart(_from, to) {
        const h = to.scale.height;
        to.cameras.main.setScroll(0, h);
      },
      onProgress(progress, from, to) {
        const h = from.scale.height;
        from.cameras.main.setScroll(0, -h * progress);
        to.cameras.main.setScroll(0, h * (1 - progress));
      },
      onComplete(_from, to) {
        to.cameras.main.setScroll(0, 0);
      },
    };
  },

  slideDown(duration = 400, ease = 'Cubic.easeInOut'): TransitionConfig {
    return {
      duration,
      ease,
      onStart(_from, to) {
        const h = to.scale.height;
        to.cameras.main.setScroll(0, -h);
      },
      onProgress(progress, from, to) {
        const h = from.scale.height;
        from.cameras.main.setScroll(0, h * progress);
        to.cameras.main.setScroll(0, -h * (1 - progress));
      },
      onComplete(_from, to) {
        to.cameras.main.setScroll(0, 0);
      },
    };
  },

  zoom(duration = 600, ease = 'Cubic.easeIn'): TransitionConfig {
    return {
      duration,
      ease,
      onStart(_from, to) {
        to.cameras.main.setAlpha(0);
        to.cameras.main.setZoom(0.5);
      },
      onProgress(progress, from, to) {
        from.cameras.main.setAlpha(1 - progress);
        from.cameras.main.setZoom(1 + progress * 0.5);
        to.cameras.main.setAlpha(progress);
        to.cameras.main.setZoom(0.5 + progress * 0.5);
      },
      onComplete(_from, to) {
        to.cameras.main.setAlpha(1);
        to.cameras.main.setZoom(1);
      },
    };
  },

  wipe(duration = 500): TransitionConfig {
    return {
      duration,
      ease: 'Linear',
      onStart(_from, to) {
        to.cameras.main.setAlpha(0);
      },
      onProgress(progress, from, to) {
        // Wipe from left to right using viewport clipping
        from.cameras.main.setAlpha(progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2);
        to.cameras.main.setAlpha(progress > 0.5 ? (progress - 0.5) * 2 : 0);
      },
      onComplete(_from, to) {
        to.cameras.main.setAlpha(1);
      },
    };
  },

  none(): TransitionConfig {
    return { duration: 0 };
  },

  custom(duration: number, callbacks: Omit<TransitionConfig, 'duration'>): TransitionConfig {
    return { duration, ...callbacks };
  },
};
