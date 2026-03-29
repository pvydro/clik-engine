import Phaser from 'phaser';
import { Color } from '../utils/color';

export interface ScorePopupConfig {
  x: number;
  y: number;
  text: string;
  color?: number;
  fontSize?: number;
  fontFamily?: string;
  stroke?: string;
  strokeThickness?: number;
  floatDistance?: number;
  duration?: number;
  delay?: number;
  depth?: number;
  scalePunch?: boolean;
  punchScale?: number;
}

/**
 * Self-destructing floating text popups for score, damage, and feedback.
 */
export const ScorePopup = {
  /**
   * Show a generic floating text popup.
   */
  show(scene: Phaser.Scene, config: ScorePopupConfig): void {
    const color = Color.numberToHex(config.color ?? 0xffffff);
    const fontSize = config.fontSize ?? 16;
    const floatDist = config.floatDistance ?? 50;
    const dur = config.duration ?? 800;
    const delay = config.delay ?? 200;
    const depth = config.depth ?? 90;

    const text = scene.add.text(config.x, config.y, config.text, {
      fontSize: `${fontSize}px`,
      fontFamily: config.fontFamily ?? 'monospace',
      color,
      fontStyle: 'bold',
      stroke: config.stroke ?? '#000000',
      strokeThickness: config.strokeThickness ?? 3,
    }).setOrigin(0.5).setDepth(depth);

    // Scale punch
    if (config.scalePunch) {
      const ps = config.punchScale ?? 1.2;
      text.setScale(0.5);
      scene.tweens.add({
        targets: text,
        scaleX: ps,
        scaleY: ps,
        duration: 120,
        ease: 'Back.easeOut',
        yoyo: true,
        onYoyo: () => {
          text.setScale(1);
        },
      });
    }

    // Float up and fade
    scene.tweens.add({
      targets: text,
      y: config.y - floatDist,
      duration: dur,
      ease: 'Quad.easeOut',
    });

    scene.tweens.add({
      targets: text,
      alpha: 0,
      delay,
      duration: dur - delay,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  },

  /**
   * Score-specific popup: formats "+{value}", scales with combo.
   */
  score(scene: Phaser.Scene, x: number, y: number, value: number, combo = 1): void {
    const text = combo > 1 ? `+${value} x${combo}` : `+${value}`;
    const fontSize = combo >= 4 ? 22 : combo >= 2 ? 18 : 14;
    const dur = 700 + combo * 100;
    const floatDist = 50 + combo * 5;

    ScorePopup.show(scene, {
      x, y, text, fontSize,
      floatDistance: floatDist,
      duration: dur,
      scalePunch: combo >= 3,
      punchScale: 1.2,
    });
  },

  /**
   * Damage number: formats "-{value}", red color.
   */
  damage(scene: Phaser.Scene, x: number, y: number, value: number): void {
    ScorePopup.show(scene, {
      x, y,
      text: `-${value}`,
      color: 0xff0044,
      fontSize: 18,
      scalePunch: true,
    });
  },

  /**
   * Custom feedback text: "COMBO x3!", "PERFECT!", etc.
   */
  feedback(scene: Phaser.Scene, x: number, y: number, text: string, config?: {
    color?: number;
    fontSize?: number;
    scalePunch?: boolean;
  }): void {
    ScorePopup.show(scene, {
      x, y, text,
      color: config?.color ?? 0xffcc00,
      fontSize: config?.fontSize ?? 20,
      scalePunch: config?.scalePunch ?? true,
      floatDistance: 40,
      duration: 900,
    });
  },
};
