import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { TransitionConfig } from './transitions';

export class SceneDirector {
  private game: Phaser.Game;

  constructor(game: Phaser.Game) {
    this.game = game;
  }

  go(from: string, to: string, transition?: TransitionConfig, data?: object): void {
    ConsoleReporter.scene(`transition: ${from} → ${to}`, { transition: transition?.duration ?? 0 });

    const targetScene = this.game.scene.getScene(to);
    if (!targetScene) {
      ConsoleReporter.error(
        `Scene '${to}' not found`,
        `Make sure '${to}' is registered in the scenes array of your ClikGameConfig.`
      );
      return;
    }

    if (!transition || transition.duration === 0) {
      this.game.scene.stop(from);
      this.game.scene.start(to, data);
      return;
    }

    // Fade out current scene, then start new one
    const fromScene = this.game.scene.getScene(from);
    if (fromScene) {
      fromScene.cameras.main.fadeOut(transition.duration / 2, 0, 0, 0);
      fromScene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.game.scene.stop(from);
        this.game.scene.start(to, data);

        const toScene = this.game.scene.getScene(to);
        if (toScene && transition.onStart) {
          transition.onStart(toScene);
        }
      });
    }
  }

  launch(sceneKey: string, data?: object): void {
    ConsoleReporter.scene(`launch parallel scene: ${sceneKey}`);
    this.game.scene.launch(sceneKey, data);
  }

  stop(sceneKey: string): void {
    ConsoleReporter.scene(`stop scene: ${sceneKey}`);
    this.game.scene.stop(sceneKey);
  }

  restart(sceneKey: string, data?: object): void {
    ConsoleReporter.scene(`restart scene: ${sceneKey}`);
    const scene = this.game.scene.getScene(sceneKey);
    scene?.scene.restart(data);
  }
}
