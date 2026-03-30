/**
 * Haptic feedback API for mobile devices.
 * Uses navigator.vibrate() for web and Capacitor Haptics plugin when available.
 */
export class HapticFeedback {
  private static isCapacitor(): boolean {
    return typeof (globalThis as Record<string, unknown>).Capacitor !== 'undefined';
  }

  private static canVibrate(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  /** Light tap feedback — button press, selection change */
  static light(): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate(10);
    }
  }

  /** Medium impact — action confirmed, item collected */
  static medium(): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate(25);
    }
  }

  /** Heavy impact — explosion, damage taken, error */
  static heavy(): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate(50);
    }
  }

  /** Success pattern — task completed, level cleared */
  static success(): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate([10, 50, 20]);
    }
  }

  /** Error pattern — invalid action, death */
  static error(): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate([30, 50, 30, 50, 30]);
    }
  }

  /** Custom vibration pattern */
  static pattern(pattern: number | number[]): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate(pattern);
    }
  }

  /** Stop any active vibration */
  static cancel(): void {
    if (HapticFeedback.canVibrate()) {
      navigator.vibrate(0);
    }
  }

  /** Check if haptic feedback is available on this device */
  static get isAvailable(): boolean {
    return HapticFeedback.canVibrate();
  }
}
