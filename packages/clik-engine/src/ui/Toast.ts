import Phaser from 'phaser';

export interface ToastConfig {
  message: string;
  duration?: number;
  backgroundColor?: number;
  color?: string;
  fontSize?: string;
  position?: 'top' | 'bottom' | 'center';
}

export class Toast {
  static show(scene: Phaser.Scene, config: ToastConfig): void {
    const { width, height } = scene.scale;
    const duration = config.duration ?? 2000;

    let y: number;
    switch (config.position ?? 'bottom') {
      case 'top': y = 60; break;
      case 'center': y = height / 2; break;
      default: y = height - 60;
    }

    const text = scene.add.text(width / 2, y + 20, config.message, {
      fontSize: config.fontSize ?? '16px',
      fontFamily: 'monospace',
      color: config.color ?? '#ffffff',
      backgroundColor: config.backgroundColor
        ? `#${config.backgroundColor.toString(16).padStart(6, '0')}`
        : '#333333dd',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setAlpha(0).setDepth(8000);

    // Slide up and fade in
    scene.tweens.add({
      targets: text,
      y: y,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold, then fade out
        scene.time.delayedCall(duration, () => {
          scene.tweens.add({
            targets: text,
            alpha: 0,
            y: y + 10,
            duration: 200,
            onComplete: () => text.destroy(),
          });
        });
      },
    });
  }
}
