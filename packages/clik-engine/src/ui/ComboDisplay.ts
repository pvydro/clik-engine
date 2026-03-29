import Phaser from 'phaser';
import { Color } from '../utils/color';
import type { GraphicsParticles } from '../particles/GraphicsParticles';

export interface ComboDisplayConfig {
  x?: number;
  y?: number;
  fontFamily?: string;
  depth?: number;
  particles?: GraphicsParticles;
}

/**
 * Dramatic combo counter display with glow shadow, screen flash, and particle burst.
 */
export class ComboDisplay {
  private scene: Phaser.Scene;
  private mainText: Phaser.GameObjects.Text | null = null;
  private glowText: Phaser.GameObjects.Text | null = null;
  private config: Required<Pick<ComboDisplayConfig, 'depth'>> & ComboDisplayConfig;
  private hideTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config?: ComboDisplayConfig) {
    this.scene = scene;
    this.config = {
      depth: 100,
      ...config,
    };
  }

  /**
   * Show combo text with dramatic entrance.
   */
  show(combo: number, config?: { color?: number; text?: string; screenFlash?: boolean }): void {
    // Clean previous
    this.hide();

    const { width, height } = this.scene.scale;
    const x = this.config.x ?? width / 2;
    const y = this.config.y ?? 80;
    const color = config?.color ?? 0x00fff0;
    const colorHex = Color.numberToHex(color);
    const text = config?.text ?? `x${combo} CHAIN!`;
    const fontSize = 28 + combo * 5;

    // Glow shadow behind text
    this.glowText = this.scene.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      fontFamily: this.config.fontFamily ?? 'monospace',
      color: colorHex,
      fontStyle: 'bold',
      stroke: colorHex,
      strokeThickness: 12,
    }).setOrigin(0.5).setDepth(this.config.depth - 1).setAlpha(0.25);

    // Main text
    this.mainText = this.scene.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      fontFamily: this.config.fontFamily ?? 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(this.config.depth);

    // Entrance: scale 2→1, angle -5→0
    for (const t of [this.mainText, this.glowText]) {
      t.setScale(2);
      t.setAngle(-5);
      this.scene.tweens.add({
        targets: t,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }

    // Screen flash at combo >= 4
    const doFlash = config?.screenFlash ?? combo >= 4;
    if (doFlash) {
      const flashAlpha = 0.12 + combo * 0.02;
      const flash = this.scene.add.rectangle(width / 2, height / 2, width * 2, height * 2, 0xffffff, flashAlpha)
        .setDepth(9999).setScrollFactor(0);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 150,
        onComplete: () => flash.destroy(),
      });
    }

    // Particle burst at combo >= 3
    if (combo >= 3 && this.config.particles) {
      this.config.particles.celebrate(x, y, color, { count: 8 + combo * 3 });
    }

    // Exit: fade + float up after delay
    this.hideTimer = this.scene.time.delayedCall(400, () => {
      for (const t of [this.mainText, this.glowText]) {
        if (!t) continue;
        this.scene.tweens.add({
          targets: t,
          alpha: 0,
          y: y - 40,
          duration: 900,
          ease: 'Quad.easeIn',
          onComplete: () => t.destroy(),
        });
      }
      this.mainText = null;
      this.glowText = null;
    });
  }

  /**
   * Hide immediately.
   */
  hide(): void {
    if (this.hideTimer) {
      this.hideTimer.destroy();
      this.hideTimer = null;
    }
    this.mainText?.destroy();
    this.glowText?.destroy();
    this.mainText = null;
    this.glowText = null;
  }

  destroy(): void {
    this.hide();
  }
}
