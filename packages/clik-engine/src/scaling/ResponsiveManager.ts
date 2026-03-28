import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { BaseScene } from '../scenes/BaseScene';

export class ResponsiveManager {
  private game: Phaser.Game;

  constructor(game: Phaser.Game) {
    this.game = game;

    game.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: Phaser.Structs.Size) => {
      const width = gameSize.width;
      const height = gameSize.height;

      ConsoleReporter.engine(`Resize: ${width}x${height}`);

      for (const scene of game.scene.getScenes(true)) {
        if (scene instanceof BaseScene) {
          scene.onResize(width, height);
        }
      }
    });
  }

  isPortrait(): boolean {
    return this.game.scale.height > this.game.scale.width;
  }

  isLandscape(): boolean {
    return this.game.scale.width >= this.game.scale.height;
  }

  isMobile(): boolean {
    return !this.game.device.os.desktop;
  }

  isDesktop(): boolean {
    return this.game.device.os.desktop;
  }

  get width(): number {
    return this.game.scale.width;
  }

  get height(): number {
    return this.game.scale.height;
  }
}
