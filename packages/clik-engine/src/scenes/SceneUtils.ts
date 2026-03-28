import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Common scene utility functions.
 */
export const SceneUtils = {
  /**
   * Wait for a duration (ms) — use in async scene methods.
   */
  wait(scene: Phaser.Scene, ms: number): Promise<void> {
    return new Promise(resolve => {
      scene.time.delayedCall(ms, resolve);
    });
  },

  /**
   * Flash the screen a color (damage, power-up, etc.)
   */
  screenFlash(scene: Phaser.Scene, color = 0xffffff, duration = 100): Promise<void> {
    const { width, height } = scene.scale;
    const flash = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, color, 0.8)
      .setDepth(9999).setScrollFactor(0);

    return new Promise(resolve => {
      scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        onComplete: () => { flash.destroy(); resolve(); },
      });
    });
  },

  /**
   * Freeze the scene for a duration (hit-stop / hit-lag effect).
   */
  async hitStop(scene: Phaser.Scene, durationMs = 50): Promise<void> {
    scene.time.timeScale = 0;
    scene.physics?.world?.pause();
    await SceneUtils.wait(scene, durationMs);
    scene.time.timeScale = 1;
    scene.physics?.world?.resume();
  },

  /**
   * Slow motion effect.
   */
  slowMotion(scene: Phaser.Scene, scale = 0.3, durationMs = 1000): void {
    scene.time.timeScale = scale;
    if (scene.physics?.world) scene.physics.world.timeScale = scale;
    scene.time.delayedCall(durationMs * scale, () => {
      scene.time.timeScale = 1;
      if (scene.physics?.world) scene.physics.world.timeScale = 1;
    });
    ConsoleReporter.engine(`Slow motion: ${scale}x for ${durationMs}ms`);
  },

  /**
   * Countdown timer displayed on screen.
   * Returns a promise that resolves when countdown reaches 0.
   */
  countdown(scene: Phaser.Scene, seconds: number, x?: number, y?: number): Promise<void> {
    const { width, height } = scene.scale;
    const cx = x ?? width / 2;
    const cy = y ?? height / 2;

    return new Promise(resolve => {
      let remaining = seconds;
      const text = scene.add.text(cx, cy, String(remaining), {
        fontSize: '64px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(9000).setScrollFactor(0);

      const timer = scene.time.addEvent({
        delay: 1000,
        repeat: seconds - 1,
        callback: () => {
          remaining--;
          if (remaining > 0) {
            text.setText(String(remaining));
            scene.tweens.add({
              targets: text,
              scaleX: 1.3, scaleY: 1.3,
              duration: 100,
              yoyo: true,
            });
          } else {
            text.setText('GO!');
            scene.tweens.add({
              targets: text,
              scaleX: 2, scaleY: 2, alpha: 0,
              duration: 500,
              onComplete: () => { text.destroy(); resolve(); },
            });
          }
        },
      });
    });
  },

  /**
   * Simple screen wipe (black rectangle slides across).
   */
  wipe(scene: Phaser.Scene, direction: 'left' | 'right' = 'left', duration = 400, color = 0x000000): Promise<void> {
    const { width, height } = scene.scale;
    const startX = direction === 'left' ? width + width / 2 : -width / 2;
    const endX = width / 2;

    const rect = scene.add.rectangle(startX, height / 2, width, height, color)
      .setDepth(9999).setScrollFactor(0);

    return new Promise(resolve => {
      scene.tweens.add({
        targets: rect,
        x: endX,
        duration: duration / 2,
        onComplete: () => {
          scene.tweens.add({
            targets: rect,
            x: direction === 'left' ? -width / 2 : width + width / 2,
            duration: duration / 2,
            onComplete: () => { rect.destroy(); resolve(); },
          });
        },
      });
    });
  },
};
