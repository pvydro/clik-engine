import Phaser from 'phaser';

export interface NotificationConfig {
  title: string;
  message?: string;
  icon?: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  backgroundColor?: number;
  titleColor?: string;
  messageColor?: string;
  width?: number;
}

/**
 * Slide-in notification panel. More prominent than Toast,
 * with title + message + optional icon.
 */
export class Notification {
  static show(scene: Phaser.Scene, config: NotificationConfig): void {
    const { width: sw, height: sh } = scene.scale;
    const w = config.width ?? 280;
    const h = config.message ? 70 : 45;
    const duration = config.duration ?? 4000;
    const pos = config.position ?? 'top-right';

    let startX: number, startY: number, endX: number, endY: number;

    switch (pos) {
      case 'top-right':
        startX = sw + w / 2; endX = sw - w / 2 - 10;
        startY = 10 + h / 2; endY = startY;
        break;
      case 'top-left':
        startX = -w / 2; endX = w / 2 + 10;
        startY = 10 + h / 2; endY = startY;
        break;
      case 'bottom-right':
        startX = sw + w / 2; endX = sw - w / 2 - 10;
        startY = sh - 10 - h / 2; endY = startY;
        break;
      case 'bottom-left':
        startX = -w / 2; endX = w / 2 + 10;
        startY = sh - 10 - h / 2; endY = startY;
        break;
    }

    const container = scene.add.container(startX, startY).setDepth(8500).setScrollFactor(0);

    const bg = scene.add.rectangle(0, 0, w, h, config.backgroundColor ?? 0x1a1a2e, 0.95)
      .setStrokeStyle(1, 0x333355);
    container.add(bg);

    const textX = config.icon ? -w / 2 + 50 : -w / 2 + 12;

    const title = scene.add.text(textX, config.message ? -12 : 0, config.title, {
      fontSize: '14px', fontFamily: 'monospace', color: config.titleColor ?? '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(title);

    if (config.message) {
      const msg = scene.add.text(textX, 10, config.message, {
        fontSize: '11px', fontFamily: 'monospace', color: config.messageColor ?? '#888888',
        wordWrap: { width: w - (config.icon ? 60 : 24) },
      }).setOrigin(0, 0.5);
      container.add(msg);
    }

    if (config.icon) {
      const icon = scene.add.image(-w / 2 + 25, 0, config.icon).setDisplaySize(28, 28);
      container.add(icon);
    }

    // Slide in
    scene.tweens.add({
      targets: container,
      x: endX,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Hold, then slide out
        scene.time.delayedCall(duration, () => {
          scene.tweens.add({
            targets: container,
            x: startX,
            duration: 250,
            ease: 'Cubic.easeIn',
            onComplete: () => container.destroy(),
          });
        });
      },
    });
  }
}
