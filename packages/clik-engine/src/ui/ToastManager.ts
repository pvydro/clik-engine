import Phaser from 'phaser';
import { themedTextColor, themedFont, themedFontSize } from './themed';
import { getTheme } from './Theme';

export interface ToastManagerConfig {
  /** Maximum visible toasts at once (default: 3) */
  maxVisible?: number;
  /** Default toast duration in ms (default: 2000) */
  defaultDuration?: number;
  /** Position on screen (default: 'bottom') */
  position?: 'top' | 'bottom' | 'center';
  /** Spacing between stacked toasts in pixels (default: 8) */
  spacing?: number;
}

export interface ToastOptions {
  message: string;
  duration?: number;
  backgroundColor?: number;
  color?: string;
  fontSize?: string;
  /** Override position for this toast only */
  position?: 'top' | 'bottom' | 'center';
}

interface ActiveToast {
  text: Phaser.GameObjects.Text;
  timer: Phaser.Time.TimerEvent | null;
  removing: boolean;
}

/**
 * Queued toast notification manager.
 * Shows toasts in a stack, auto-dismisses, respects max visible limit.
 */
export class ToastManager {
  private scene: Phaser.Scene;
  private config: Required<ToastManagerConfig>;
  private activeToasts: ActiveToast[] = [];
  private queue: ToastOptions[] = [];

  constructor(scene: Phaser.Scene, config?: ToastManagerConfig) {
    this.scene = scene;
    this.config = {
      maxVisible: config?.maxVisible ?? 3,
      defaultDuration: config?.defaultDuration ?? 2000,
      position: config?.position ?? 'bottom',
      spacing: config?.spacing ?? 8,
    };
  }

  /** Show a toast. If max visible reached, queues it. */
  show(options: ToastOptions): void {
    if (this.activeToasts.length >= this.config.maxVisible) {
      this.queue.push(options);
      return;
    }
    this.createToast(options);
  }

  /** Remove all active toasts and clear the queue */
  clear(): void {
    this.queue.length = 0;
    for (const toast of [...this.activeToasts]) {
      this.removeToast(toast, true);
    }
  }

  /** Update max visible count */
  setMaxVisible(n: number): void {
    this.config.maxVisible = n;
  }

  /** Get number of active toasts */
  get activeCount(): number {
    return this.activeToasts.length;
  }

  /** Get number of queued toasts */
  get queuedCount(): number {
    return this.queue.length;
  }

  destroy(): void {
    this.clear();
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private createToast(options: ToastOptions): void {
    const { width, height } = this.scene.scale;
    const position = options.position ?? this.config.position;
    const duration = options.duration ?? this.config.defaultDuration;

    const baseY = this.getBaseY(position, height);
    const slotIndex = this.activeToasts.length;
    const direction = position === 'top' ? 1 : -1;
    const targetY = baseY + slotIndex * (40 + this.config.spacing) * direction;

    const text = this.scene.add.text(width / 2, targetY + 20 * direction, options.message, {
      fontSize: themedFontSize(options.fontSize),
      fontFamily: themedFont(undefined),
      color: themedTextColor(options.color),
      backgroundColor: options.backgroundColor
        ? `#${options.backgroundColor.toString(16).padStart(6, '0')}`
        : `#${getTheme().colors.surface.toString(16).padStart(6, '0')}dd`,
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setAlpha(0).setDepth(8000 + slotIndex);

    const toast: ActiveToast = { text, timer: null, removing: false };
    this.activeToasts.push(toast);

    // Slide in
    this.scene.tweens.add({
      targets: text,
      y: targetY,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Auto-dismiss after duration
        toast.timer = this.scene.time.delayedCall(duration, () => {
          this.removeToast(toast);
        });
      },
    });
  }

  private removeToast(toast: ActiveToast, immediate = false): void {
    if (toast.removing) return;
    toast.removing = true;

    if (toast.timer) {
      toast.timer.destroy();
      toast.timer = null;
    }

    if (immediate) {
      toast.text.destroy();
      this.finalizeRemoval(toast);
      return;
    }

    // Fade out
    this.scene.tweens.add({
      targets: toast.text,
      alpha: 0,
      y: toast.text.y + 10,
      duration: 200,
      onComplete: () => {
        toast.text.destroy();
        this.finalizeRemoval(toast);
      },
    });
  }

  private finalizeRemoval(toast: ActiveToast): void {
    const idx = this.activeToasts.indexOf(toast);
    if (idx >= 0) this.activeToasts.splice(idx, 1);

    // Reposition remaining toasts
    this.repositionToasts();

    // Show queued toast if available
    if (this.queue.length > 0 && this.activeToasts.length < this.config.maxVisible) {
      const next = this.queue.shift()!;
      this.createToast(next);
    }
  }

  private repositionToasts(): void {
    const { height } = this.scene.scale;
    const baseY = this.getBaseY(this.config.position, height);
    const direction = this.config.position === 'top' ? 1 : -1;

    for (let i = 0; i < this.activeToasts.length; i++) {
      const toast = this.activeToasts[i];
      if (toast.removing) continue;
      const targetY = baseY + i * (40 + this.config.spacing) * direction;
      this.scene.tweens.add({
        targets: toast.text,
        y: targetY,
        duration: 150,
        ease: 'Sine.easeOut',
      });
    }
  }

  private getBaseY(position: string, height: number): number {
    switch (position) {
      case 'top': return 60;
      case 'center': return height / 2;
      default: return height - 60;
    }
  }
}
