import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface SplitScreenConfig {
  players: 2 | 4;
  gap?: number;
}

export interface MinimapConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
  borderColor?: number;
  borderWidth?: number;
  alpha?: number;
}

/**
 * Multi-camera utilities for split-screen and minimap.
 */
export class MultiCamera {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Set up split-screen for 2 or 4 players.
   * Returns an array of cameras, one per player.
   */
  splitScreen(config: SplitScreenConfig): Phaser.Cameras.Scene2D.Camera[] {
    const { width, height } = this.scene.scale;
    const gap = config.gap ?? 2;
    const cameras: Phaser.Cameras.Scene2D.Camera[] = [];

    // Resize main camera for player 1
    const main = this.scene.cameras.main;

    if (config.players === 2) {
      // Side by side
      const halfW = Math.floor((width - gap) / 2);
      main.setViewport(0, 0, halfW, height);
      cameras.push(main);

      const cam2 = this.scene.cameras.add(halfW + gap, 0, halfW, height);
      cameras.push(cam2);
    } else {
      // 4-way split
      const halfW = Math.floor((width - gap) / 2);
      const halfH = Math.floor((height - gap) / 2);

      main.setViewport(0, 0, halfW, halfH);
      cameras.push(main);

      cameras.push(this.scene.cameras.add(halfW + gap, 0, halfW, halfH));
      cameras.push(this.scene.cameras.add(0, halfH + gap, halfW, halfH));
      cameras.push(this.scene.cameras.add(halfW + gap, halfH + gap, halfW, halfH));
    }

    ConsoleReporter.engine(`Split screen: ${config.players} players`);
    return cameras;
  }

  /**
   * Create a minimap camera showing a zoomed-out view of the world.
   */
  createMinimap(config: MinimapConfig): Phaser.Cameras.Scene2D.Camera {
    const minimap = this.scene.cameras.add(
      config.x, config.y, config.width, config.height
    );

    minimap.setZoom(config.zoom ?? 0.2);
    minimap.setAlpha(config.alpha ?? 0.8);
    minimap.setBackgroundColor(0x000000);

    // Ignore UI/debug scenes
    const ignoredScenes = this.scene.game.scene.getScenes(true)
      .filter(s => s.scene.key.startsWith('__clik_'));
    for (const s of ignoredScenes) {
      minimap.ignore(s.children.list);
    }

    ConsoleReporter.engine('Minimap created', { x: config.x, y: config.y, zoom: config.zoom });
    return minimap;
  }

  /**
   * Create a picture-in-picture camera focused on a specific area or target.
   */
  createPIP(
    x: number, y: number,
    width: number, height: number,
    followTarget?: Phaser.GameObjects.GameObject,
    zoom = 1,
  ): Phaser.Cameras.Scene2D.Camera {
    const pip = this.scene.cameras.add(x, y, width, height);
    pip.setZoom(zoom);

    if (followTarget) {
      pip.startFollow(followTarget);
    }

    ConsoleReporter.engine('PIP camera created');
    return pip;
  }

  /** Remove all cameras except the main camera and reset it */
  reset(): void {
    const { width, height } = this.scene.scale;

    // Remove extra cameras
    const cameras = this.scene.cameras.cameras;
    for (let i = cameras.length - 1; i > 0; i--) {
      this.scene.cameras.remove(cameras[i]);
    }

    // Reset main camera
    this.scene.cameras.main.setViewport(0, 0, width, height);
    this.scene.cameras.main.setZoom(1);
    this.scene.cameras.main.setScroll(0, 0);

    ConsoleReporter.engine('Multi-camera reset');
  }
}
