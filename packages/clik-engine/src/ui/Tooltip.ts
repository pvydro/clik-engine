import Phaser from 'phaser';

export interface TooltipConfig {
  text: string;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: number;
  padding?: number;
  offsetY?: number;
  delay?: number;
}

/**
 * Shows a tooltip when hovering over a game object.
 */
export class Tooltip {
  /**
   * Attach a tooltip to a game object. Shows on hover after delay.
   */
  static attach(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    config: TooltipConfig,
  ): void {
    let tip: Phaser.GameObjects.Container | null = null;
    let delayTimer: Phaser.Time.TimerEvent | null = null;

    target.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      delayTimer = scene.time.delayedCall(config.delay ?? 300, () => {
        if (tip) return;

        const text = scene.add.text(0, 0, config.text, {
          fontSize: config.fontSize ?? '12px',
          fontFamily: config.fontFamily ?? 'monospace',
          color: config.color ?? '#ffffff',
          padding: { x: config.padding ?? 6, y: config.padding ?? 4 },
          backgroundColor: config.backgroundColor
            ? `#${(config.backgroundColor).toString(16).padStart(6, '0')}`
            : '#222222ee',
        }).setOrigin(0.5, 1);

        const targetObj = target as unknown as { x: number; y: number };
        const offsetY = config.offsetY ?? -20;

        tip = scene.add.container(targetObj.x, targetObj.y + offsetY, [text])
          .setDepth(9500)
          .setAlpha(0);

        scene.tweens.add({ targets: tip, alpha: 1, duration: 150 });
      });
    });

    const hideTooltip = () => {
      delayTimer?.destroy();
      delayTimer = null;
      if (tip) {
        const t = tip;
        scene.tweens.add({
          targets: t,
          alpha: 0,
          duration: 100,
          onComplete: () => { t.destroy(); },
        });
        tip = null;
      }
    };

    target.on('pointerout', hideTooltip);
    target.on('destroy', hideTooltip);
  }
}
