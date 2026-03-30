import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: number;
  cancelColor?: number;
  width?: number;
  height?: number;
}

/**
 * Pre-built confirmation dialog with confirm/cancel buttons.
 * Returns a promise that resolves true (confirm) or false (cancel).
 *
 * @example
 * const confirmed = await ConfirmDialog.show(scene, {
 *   title: 'Quit?',
 *   message: 'Your progress will be lost.',
 * });
 */
export class ConfirmDialog {
  static show(scene: Phaser.Scene, config: ConfirmDialogConfig): Promise<boolean> {
    return new Promise(resolve => {
      const { width: sw, height: sh } = scene.scale;
      const w = config.width ?? 350;
      const h = config.height ?? 180;

      const container = scene.add.container(sw / 2, sh / 2).setDepth(9100);

      // Backdrop
      const backdrop = scene.add.rectangle(0, 0, sw * 2, sh * 2, 0x000000, 0.6)
        .setInteractive(); // Block clicks through
      container.add(backdrop);

      // Panel
      const panel = scene.add.rectangle(0, 0, w, h, 0x1a1a2e).setStrokeStyle(1, 0x333355);
      container.add(panel);

      // Title
      const title = scene.add.text(0, -h / 2 + 24, config.title, {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      container.add(title);

      // Message
      const msg = scene.add.text(0, -10, config.message, {
        fontSize: '13px', fontFamily: 'monospace', color: '#aaaaaa',
        wordWrap: { width: w - 40 }, align: 'center',
      }).setOrigin(0.5);
      container.add(msg);

      const btnY = h / 2 - 35;
      const btnW = 100;
      const btnH = 32;

      // Cancel button
      const cancelBg = scene.add.rectangle(-60, btnY, btnW, btnH, config.cancelColor ?? 0x444444)
        .setInteractive({ useHandCursor: true });
      const cancelText = scene.add.text(-60, btnY, config.cancelText ?? 'Cancel', {
        fontSize: '14px', fontFamily: 'monospace', color: '#cccccc',
      }).setOrigin(0.5);
      container.add([cancelBg, cancelText]);

      cancelBg.on('pointerover', () => cancelBg.setFillStyle(0x555555));
      cancelBg.on('pointerout', () => cancelBg.setFillStyle(config.cancelColor ?? 0x444444));
      cancelBg.on('pointerup', () => {
        container.destroy();
        ConsoleReporter.input('confirm dialog: cancelled');
        resolve(false);
      });

      // Confirm button
      const confirmBg = scene.add.rectangle(60, btnY, btnW, btnH, config.confirmColor ?? 0x00aa66)
        .setInteractive({ useHandCursor: true });
      const confirmText = scene.add.text(60, btnY, config.confirmText ?? 'Confirm', {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5);
      container.add([confirmBg, confirmText]);

      confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x00cc77));
      confirmBg.on('pointerout', () => confirmBg.setFillStyle(config.confirmColor ?? 0x00aa66));
      confirmBg.on('pointerup', () => {
        container.destroy();
        ConsoleReporter.input('confirm dialog: confirmed');
        resolve(true);
      });

      // Fade in
      container.setAlpha(0);
      scene.tweens.add({ targets: container, alpha: 1, duration: 150 });
    });
  }
}
