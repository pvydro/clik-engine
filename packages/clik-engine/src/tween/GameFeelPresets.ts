import Phaser from 'phaser';
import { tween, tweenSequence } from './TweenHelper';
import { Color } from '../utils/color';

export interface GameFeelConfig {
  duration?: number;
  ease?: string;
  intensity?: number;
}

/**
 * Game-feel animation presets: merge squash, impact pop, score roll, etc.
 * All methods return Promise<void> and build on TweenHelper.
 */
export const GameFeelPresets = {
  /**
   * 3-step merge animation: squash → bounce → settle.
   * Creates a satisfying impact feel on tile merges.
   */
  async mergeSquash(
    scene: Phaser.Scene,
    target: object,
    config?: { squashDuration?: number; bounceDuration?: number; settleDuration?: number; intensity?: number },
  ): Promise<void> {
    const i = config?.intensity ?? 1.0;
    await tweenSequence(scene, target, [
      { props: { scaleX: 1 + 0.35 * i, scaleY: 1 - 0.25 * i }, config: { duration: config?.squashDuration ?? 70, ease: 'Quad.easeOut' } },
      { props: { scaleX: 1 - 0.15 * i, scaleY: 1 + 0.2 * i }, config: { duration: config?.bounceDuration ?? 60, ease: 'Quad.easeOut' } },
      { props: { scaleX: 1, scaleY: 1 }, config: { duration: config?.settleDuration ?? 80, ease: 'Quad.easeOut' } },
    ]);
  },

  /**
   * Quick scale punch (score counter, collect).
   */
  impactPop(
    scene: Phaser.Scene,
    target: object,
    config?: { scale?: number; duration?: number },
  ): Promise<void> {
    const s = config?.scale ?? 1.2;
    return tween(scene, target, { scaleX: s, scaleY: s }, {
      duration: config?.duration ?? 80,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
  },

  /**
   * Scale up then shrink to 0 with fade (item collect).
   */
  async collectShrink(
    scene: Phaser.Scene,
    target: object,
    config?: { peakScale?: number; duration?: number },
  ): Promise<void> {
    const peak = config?.peakScale ?? 1.3;
    const dur = config?.duration ?? 300;
    await tween(scene, target, { scaleX: peak, scaleY: peak }, { duration: dur * 0.3, ease: 'Quad.easeOut' });
    await tween(scene, target, { scaleX: 0, scaleY: 0, alpha: 0 }, { duration: dur * 0.7, ease: 'Quad.easeIn' });
  },

  /**
   * Spawn scale from 0 with overshoot.
   */
  spawnIn(
    scene: Phaser.Scene,
    target: object,
    config?: { duration?: number; ease?: string },
  ): Promise<void> {
    (target as Record<string, number>).scaleX = 0;
    (target as Record<string, number>).scaleY = 0;
    return tween(scene, target, { scaleX: 1, scaleY: 1 }, {
      duration: config?.duration ?? 200,
      ease: config?.ease ?? 'Back.easeOut',
    });
  },

  /**
   * Death: shrink + fade + optional spin.
   */
  despawn(
    scene: Phaser.Scene,
    target: object,
    config?: { duration?: number; spin?: boolean },
  ): Promise<void> {
    const dur = config?.duration ?? 250;
    const props: Record<string, number> = { scaleX: 0, scaleY: 0, alpha: 0 };
    if (config?.spin) {
      props.angle = (target as Record<string, number>).angle + 360;
    }
    return tween(scene, target, props, { duration: dur, ease: 'Quad.easeIn' });
  },

  /**
   * Temporary white/colored glow flash on a container.
   * Creates a glow Graphics, fades it out, then destroys it.
   */
  async flashGlow(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Container | Phaser.GameObjects.GameObject,
    config?: { color?: number; alpha?: number; duration?: number; expand?: number; size?: number },
  ): Promise<void> {
    const color = config?.color ?? 0xffffff;
    const alpha = config?.alpha ?? 0.6;
    const dur = config?.duration ?? 250;
    const expand = config?.expand ?? 4;
    const size = config?.size ?? 100;
    const half = size / 2 + expand;

    const gfx = scene.add.graphics();
    gfx.fillStyle(color, alpha);
    gfx.fillRoundedRect(-half, -half, half * 2, half * 2, 12);

    const pos = target as unknown as { x: number; y: number; depth?: number };
    gfx.setPosition(pos.x, pos.y);
    gfx.setDepth((pos.depth ?? 0) - 1);

    await tween(scene, gfx, { alpha: 0 }, { duration: dur, ease: 'Quad.easeOut' });
    gfx.destroy();
  },

  /**
   * Tint flash (damage, collect).
   */
  async flashTint(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Tint,
    config?: { color?: number; duration?: number },
  ): Promise<void> {
    const color = config?.color ?? 0xffffff;
    const dur = config?.duration ?? 100;
    const sprite = target as Phaser.GameObjects.Sprite;
    sprite.setTintFill(color);
    await new Promise<void>(resolve => {
      scene.time.delayedCall(dur, () => {
        sprite.clearTint();
        resolve();
      });
    });
  },

  /**
   * Animate a text object's displayed number from→to with optional flash and punch.
   */
  numberRoll(
    scene: Phaser.Scene,
    textObj: Phaser.GameObjects.Text,
    from: number,
    to: number,
    config?: {
      duration?: number;
      ease?: string;
      format?: (n: number) => string;
      flash?: boolean;
      punch?: boolean;
      flashColor?: string;
      originalColor?: string;
    },
  ): Promise<void> {
    const dur = config?.duration ?? 300;
    const fmt = config?.format ?? ((n: number) => String(Math.round(n)));
    const doFlash = config?.flash ?? true;
    const doPunch = config?.punch ?? true;

    // Flash white
    if (doFlash) {
      textObj.setColor(config?.flashColor ?? '#ffffff');
      scene.time.delayedCall(150, () => {
        textObj.setColor(config?.originalColor ?? '#88c0d0');
      });
    }

    // Scale punch
    if (doPunch) {
      scene.tweens.add({
        targets: textObj,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 80,
        ease: 'Quad.easeOut',
        yoyo: true,
      });
    }

    // Number roll
    return new Promise(resolve => {
      const counter = { val: from };
      scene.tweens.add({
        targets: counter,
        val: to,
        duration: dur,
        ease: config?.ease ?? 'Quad.easeOut',
        onUpdate: () => {
          textObj.setText(fmt(counter.val));
        },
        onComplete: () => resolve(),
      });
    });
  },

  /**
   * Slide a target to position (for grid tile movement).
   */
  slideTo(
    scene: Phaser.Scene,
    target: object,
    toX: number,
    toY: number,
    config?: { duration?: number; ease?: string },
  ): Promise<void> {
    return tween(scene, target, { x: toX, y: toY }, {
      duration: config?.duration ?? 120,
      ease: config?.ease ?? 'Cubic.easeOut',
    });
  },
};
