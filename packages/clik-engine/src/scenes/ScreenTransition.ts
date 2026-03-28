import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Full-screen transition effects that overlay the entire game.
 * Use for scene changes, level transitions, cutscene entry/exit.
 */
export class ScreenTransition {
  /**
   * Fade to black, execute a callback (e.g., scene switch), then fade back in.
   */
  static async fadeThrough(
    scene: Phaser.Scene,
    callback: () => void | Promise<void>,
    duration = 400,
    color = 0x000000,
  ): Promise<void> {
    const { width, height } = scene.scale;
    const overlay = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, color, 0)
      .setDepth(9999).setScrollFactor(0);

    // Fade in overlay
    await new Promise<void>(resolve => {
      scene.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: duration / 2,
        onComplete: () => resolve(),
      });
    });

    // Execute callback while screen is black
    await callback();

    // Fade out overlay
    await new Promise<void>(resolve => {
      scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: duration / 2,
        onComplete: () => { overlay.destroy(); resolve(); },
      });
    });
  }

  /**
   * Diamond/iris wipe effect — circle shrinks to center then expands.
   */
  static async irisWipe(
    scene: Phaser.Scene,
    callback: () => void | Promise<void>,
    duration = 800,
  ): Promise<void> {
    const { width, height } = scene.scale;
    const maxRadius = Math.sqrt(width * width + height * height) / 2;
    const cx = width / 2;
    const cy = height / 2;

    const graphics = scene.add.graphics().setDepth(9999).setScrollFactor(0);

    // Close iris
    await new Promise<void>(resolve => {
      const proxy = { radius: maxRadius };
      scene.tweens.add({
        targets: proxy,
        radius: 0,
        duration: duration / 2,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          graphics.clear();
          graphics.fillStyle(0x000000, 1);
          graphics.fillRect(0, 0, width, height);
          // Cut out circle
          graphics.fillStyle(0x000000, 0);
          // Use blend mode trick — draw circle as "hole"
          // Simpler: just fill everything except circle
          graphics.clear();
          graphics.fillStyle(0x000000, 1);
          // Top
          graphics.fillRect(0, 0, width, Math.max(0, cy - proxy.radius));
          // Bottom
          graphics.fillRect(0, cy + proxy.radius, width, height);
          // Left
          graphics.fillRect(0, cy - proxy.radius, Math.max(0, cx - proxy.radius), proxy.radius * 2);
          // Right
          graphics.fillRect(cx + proxy.radius, cy - proxy.radius, width, proxy.radius * 2);
        },
        onComplete: () => resolve(),
      });
    });

    // Fill screen black
    graphics.clear();
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(0, 0, width, height);

    await callback();

    // Open iris
    await new Promise<void>(resolve => {
      const proxy = { radius: 0 };
      scene.tweens.add({
        targets: proxy,
        radius: maxRadius,
        duration: duration / 2,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          graphics.clear();
          graphics.fillStyle(0x000000, 1);
          graphics.fillRect(0, 0, width, Math.max(0, cy - proxy.radius));
          graphics.fillRect(0, cy + proxy.radius, width, height);
          graphics.fillRect(0, cy - proxy.radius, Math.max(0, cx - proxy.radius), proxy.radius * 2);
          graphics.fillRect(cx + proxy.radius, cy - proxy.radius, width, proxy.radius * 2);
        },
        onComplete: () => { graphics.destroy(); resolve(); },
      });
    });
  }

  /**
   * Pixelate transition — game pixelates, callback fires, then de-pixelates.
   * Requires WebGL.
   */
  static async pixelate(
    scene: Phaser.Scene,
    callback: () => void | Promise<void>,
    duration = 600,
    maxPixelSize = 16,
  ): Promise<void> {
    const cam = scene.cameras.main;
    if (!cam.postFX) {
      // Fallback to fade if no PostFX
      await ScreenTransition.fadeThrough(scene, callback, duration);
      return;
    }

    const fx = cam.postFX.addPixelate(1);

    // Pixelate up
    await new Promise<void>(resolve => {
      scene.tweens.add({
        targets: fx,
        amount: maxPixelSize,
        duration: duration / 2,
        onComplete: () => resolve(),
      });
    });

    await callback();

    // De-pixelate
    await new Promise<void>(resolve => {
      scene.tweens.add({
        targets: fx,
        amount: 1,
        duration: duration / 2,
        onComplete: () => { cam.postFX.remove(fx); resolve(); },
      });
    });
  }
}
