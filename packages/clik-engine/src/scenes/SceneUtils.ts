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
   * Uses setTimeout (real time) instead of scene.time.delayedCall because
   * the latter respects timeScale and would never fire when timeScale is 0.
   */
  hitStop(scene: Phaser.Scene, durationMs = 50): void {
    scene.time.timeScale = 0;
    scene.physics?.world?.pause();
    setTimeout(() => {
      scene.time.timeScale = 1;
      scene.physics?.world?.resume();
    }, durationMs);
  },

  /**
   * Slow motion effect.
   */
  slowMotion(scene: Phaser.Scene, scale = 0.3, durationMs = 1000): void {
    scene.time.timeScale = scale;
    if (scene.physics?.world) scene.physics.world.timeScale = scale;
    // Use setTimeout — delayedCall respects timeScale
    setTimeout(() => {
      scene.time.timeScale = 1;
      if (scene.physics?.world) scene.physics.world.timeScale = 1;
    }, durationMs);
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
   * Camera shake scaled by combo count.
   */
  comboShake(scene: Phaser.Scene, combo: number, config?: {
    baseIntensity?: number;
    baseDuration?: number;
    maxCombo?: number;
  }): void {
    const baseI = config?.baseIntensity ?? 0.002;
    const baseD = config?.baseDuration ?? 100;
    const max = config?.maxCombo ?? 5;
    const intensity = baseI * combo;
    const duration = baseD * Math.min(combo, max);
    scene.cameras.main.shake(duration, intensity);
  },

  /**
   * Screen flash with custom color and alpha.
   */
  screenFlashColor(scene: Phaser.Scene, config?: {
    color?: number;
    alpha?: number;
    duration?: number;
  }): Promise<void> {
    const { width, height } = scene.scale;
    const color = config?.color ?? 0xffffff;
    const alpha = config?.alpha ?? 0.15;
    const duration = config?.duration ?? 150;
    const flash = scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, color, alpha)
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
