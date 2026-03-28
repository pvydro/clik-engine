import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { TransitionConfig } from './transitions';

export class SceneDirector {
  private scene: Phaser.Scene;
  private transitioning = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private get game(): Phaser.Game {
    return this.scene.game;
  }

  go(from: string, to: string, transition?: TransitionConfig, data?: object): void {
    if (this.transitioning) {
      ConsoleReporter.error(
        'Scene transition already in progress',
        'Wait for the current transition to complete before starting another.'
      );
      return;
    }

    ConsoleReporter.scene(`transition: ${from} → ${to}`, { duration: transition?.duration ?? 0 });

    const fromScene = this.game.scene.getScene(from);
    if (!fromScene) {
      ConsoleReporter.error(`Source scene '${from}' not found`);
      return;
    }

    // No transition — instant switch
    if (!transition || transition.duration === 0) {
      fromScene.scene.stop();
      fromScene.scene.start(to, data);
      const toScene = this.game.scene.getScene(to);
      if (toScene) transition?.onComplete?.(fromScene, toScene);
      return;
    }

    this.transitioning = true;

    // Launch the target scene and place it below the current one
    fromScene.scene.launch(to, data);
    fromScene.scene.moveBelow(from, to);

    const toScene = this.game.scene.getScene(to);
    if (!toScene) {
      ConsoleReporter.error(
        `Scene '${to}' not found`,
        `Make sure '${to}' is registered in the scenes array of your ClikGameConfig.`
      );
      this.transitioning = false;
      return;
    }

    const startTransition = () => {
      transition.onStart?.(fromScene, toScene);

      const proxy = { progress: 0 };
      toScene.tweens.add({
        targets: proxy,
        progress: 1,
        duration: transition.duration,
        ease: transition.ease ?? 'Linear',
        onUpdate: () => {
          transition.onProgress?.(proxy.progress, fromScene, toScene);
        },
        onComplete: () => {
          transition.onComplete?.(fromScene, toScene);

          fromScene.scene.stop();
          fromScene.cameras.main.setAlpha(1);
          fromScene.cameras.main.setScroll(0, 0);
          fromScene.cameras.main.setZoom(1);

          this.transitioning = false;
          ConsoleReporter.scene(`transition complete: ${from} → ${to}`);
        },
      });
    };

    if (toScene.scene.isActive()) {
      startTransition();
    } else {
      toScene.events.once('create', startTransition);
    }
  }

  launch(sceneKey: string, data?: object): void {
    ConsoleReporter.scene(`launch parallel scene: ${sceneKey}`);
    this.scene.scene.launch(sceneKey, data);
  }

  stop(sceneKey: string): void {
    ConsoleReporter.scene(`stop scene: ${sceneKey}`);
    this.scene.scene.stop(sceneKey);
  }

  restart(data?: object): void {
    ConsoleReporter.scene(`restart scene: ${this.scene.scene.key}`);
    this.scene.scene.restart(data);
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }
}
