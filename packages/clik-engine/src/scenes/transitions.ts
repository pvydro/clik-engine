export interface TransitionConfig {
  duration: number;
  onUpdate?: (progress: number, scene: Phaser.Scene) => void;
  onStart?: (scene: Phaser.Scene) => void;
  onComplete?: (scene: Phaser.Scene) => void;
}

export const Transitions = {
  fade(duration = 500): TransitionConfig {
    return {
      duration,
      onStart(scene) {
        scene.cameras.main.setAlpha(0);
      },
      onUpdate(progress, scene) {
        scene.cameras.main.setAlpha(progress);
      },
    };
  },

  slideLeft(duration = 400): TransitionConfig {
    return {
      duration,
      onStart(scene) {
        const { width } = scene.scale;
        scene.cameras.main.setScroll(width, 0);
      },
      onUpdate(progress, scene) {
        const { width } = scene.scale;
        scene.cameras.main.setScroll(width * (1 - progress), 0);
      },
    };
  },

  slideRight(duration = 400): TransitionConfig {
    return {
      duration,
      onStart(scene) {
        const { width } = scene.scale;
        scene.cameras.main.setScroll(-width, 0);
      },
      onUpdate(progress, scene) {
        const { width } = scene.scale;
        scene.cameras.main.setScroll(-width * (1 - progress), 0);
      },
    };
  },

  none(): TransitionConfig {
    return { duration: 0 };
  },
};
