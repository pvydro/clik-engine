import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export type GestureType = 'tap' | 'double_tap' | 'long_press' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch';

export interface GestureEvent {
  type: GestureType;
  x: number;
  y: number;
  velocity?: number;
  distance?: number;
  scale?: number; // pinch
  duration: number;
}

export interface GestureConfig {
  swipeThreshold?: number;
  swipeMaxTime?: number;
  longPressTime?: number;
  doubleTapTime?: number;
  tapMaxDistance?: number;
}

type GestureCallback = (event: GestureEvent) => void;

export class GestureDetector {
  private scene: Phaser.Scene;
  private config: Required<GestureConfig>;
  private listeners: Map<GestureType, GestureCallback[]> = new Map();

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private lastTapTime = 0;
  private longPressTimer: Phaser.Time.TimerEvent | null = null;
  private isDown = false;
  private pinchStartDist = 0;
  private pinchActive = false;

  constructor(scene: Phaser.Scene, config?: GestureConfig) {
    this.scene = scene;
    this.config = {
      swipeThreshold: config?.swipeThreshold ?? 50,
      swipeMaxTime: config?.swipeMaxTime ?? 300,
      longPressTime: config?.longPressTime ?? 500,
      doubleTapTime: config?.doubleTapTime ?? 300,
      tapMaxDistance: config?.tapMaxDistance ?? 15,
    };

    this.setupListeners();
  }

  on(type: GestureType, callback: GestureCallback): this {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
    return this;
  }

  off(type: GestureType, callback: GestureCallback): this {
    const cbs = this.listeners.get(type);
    if (cbs) {
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    }
    return this;
  }

  private emit(event: GestureEvent): void {
    const cbs = this.listeners.get(event.type);
    if (cbs) {
      for (const cb of cbs) cb(event);
    }
    ConsoleReporter.input(`gesture: ${event.type}`, { x: event.x, y: event.y });
  }

  private setupListeners(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startX = pointer.x;
      this.startY = pointer.y;
      this.startTime = pointer.time;
      this.isDown = true;

      // Start long press timer
      this.longPressTimer = this.scene.time.delayedCall(this.config.longPressTime, () => {
        if (this.isDown) {
          const dx = pointer.x - this.startX;
          const dy = pointer.y - this.startY;
          if (Math.sqrt(dx * dx + dy * dy) < this.config.tapMaxDistance) {
            this.emit({
              type: 'long_press',
              x: this.startX,
              y: this.startY,
              duration: this.config.longPressTime,
            });
          }
        }
      });
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.isDown = false;
      if (this.longPressTimer) {
        this.longPressTimer.destroy();
        this.longPressTimer = null;
      }

      const dx = pointer.x - this.startX;
      const dy = pointer.y - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = pointer.time - this.startTime;

      // Check swipe
      if (dist >= this.config.swipeThreshold && elapsed <= this.config.swipeMaxTime) {
        const velocity = dist / elapsed;
        const angle = Math.atan2(dy, dx);
        let type: GestureType;

        if (angle > -Math.PI / 4 && angle <= Math.PI / 4) type = 'swipe_right';
        else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) type = 'swipe_down';
        else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) type = 'swipe_up';
        else type = 'swipe_left';

        this.emit({ type, x: this.startX, y: this.startY, velocity, distance: dist, duration: elapsed });
        return;
      }

      // Check tap
      if (dist < this.config.tapMaxDistance && elapsed < this.config.longPressTime) {
        const now = pointer.time;
        if (now - this.lastTapTime < this.config.doubleTapTime) {
          this.emit({ type: 'double_tap', x: pointer.x, y: pointer.y, duration: elapsed });
          this.lastTapTime = 0;
        } else {
          this.emit({ type: 'tap', x: pointer.x, y: pointer.y, duration: elapsed });
          this.lastTapTime = now;
        }
      }
    });

    // Pinch-to-zoom (multi-touch)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.scene.input.pointer1.isDown && this.scene.input.pointer2.isDown) {
        const p1 = this.scene.input.pointer1;
        const p2 = this.scene.input.pointer2;
        this.pinchStartDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        this.pinchActive = true;
      }
    });

    this.scene.input.on('pointermove', () => {
      if (!this.pinchActive) return;
      if (!this.scene.input.pointer1.isDown || !this.scene.input.pointer2.isDown) return;

      const p1 = this.scene.input.pointer1;
      const p2 = this.scene.input.pointer2;
      const currentDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const scale = currentDist / this.pinchStartDist;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      this.emit({
        type: 'pinch',
        x: cx,
        y: cy,
        scale,
        distance: currentDist,
        duration: 0,
      });
    });

    this.scene.input.on('pointerup', () => {
      this.pinchActive = false;
    });
  }

  destroy(): void {
    this.listeners.clear();
    if (this.longPressTimer) {
      this.longPressTimer.destroy();
    }
  }
}
