import Phaser from 'phaser';
import { ConsoleReporter } from '../../debug/ConsoleReporter';
import type { ActionMap } from '../ActionMap';
import type { InputProvider } from './InputProvider';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  active: boolean;
}

/**
 * Touch/swipe input provider — detects tap and swipe gestures
 * and maps them to actions via ActionMap touch bindings.
 */
export class TouchProvider implements InputProvider {
  private scene: Phaser.Scene;
  private actionMap: ActionMap;
  private swipeState: SwipeState = { startX: 0, startY: 0, startTime: 0, active: false };
  private lastSwipe: string | null = null;
  private swipeConsumed = false;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  private swipeThreshold: number;
  private swipeMaxTime: number;

  constructor(scene: Phaser.Scene, actionMap: ActionMap, swipeThreshold = 50, swipeMaxTime = 300) {
    this.scene = scene;
    this.actionMap = actionMap;
    this.swipeThreshold = swipeThreshold;
    this.swipeMaxTime = swipeMaxTime;

    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      this.swipeState = {
        startX: pointer.x,
        startY: pointer.y,
        startTime: pointer.time,
        active: true,
      };
      this.lastSwipe = null;
      this.swipeConsumed = false;
    };
    scene.input.on('pointerdown', this.pointerDownHandler);

    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.swipeState.active) return;
      this.swipeState.active = false;

      const dx = pointer.x - this.swipeState.startX;
      const dy = pointer.y - this.swipeState.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = pointer.time - this.swipeState.startTime;

      if (dist < this.swipeThreshold || elapsed > this.swipeMaxTime) {
        if (dist < 10 && elapsed < 200) {
          this.lastSwipe = 'tap';
          this.swipeConsumed = false;
        }
        return;
      }

      const angle = Math.atan2(dy, dx);
      if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
        this.lastSwipe = 'swipe_right';
      } else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) {
        this.lastSwipe = 'swipe_down';
      } else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) {
        this.lastSwipe = 'swipe_up';
      } else {
        this.lastSwipe = 'swipe_left';
      }
      this.swipeConsumed = false;
      ConsoleReporter.input(`gesture: ${this.lastSwipe}`);
    };
    scene.input.on('pointerup', this.pointerUpHandler);
  }

  update(): void {
    // Touch state managed via event handlers
  }

  isActionDown(_action: string): boolean {
    return false; // Touch gestures are one-shot, use consumeAction
  }

  consumeAction(action: string): boolean {
    const touchBinding = this.actionMap.getTouch(action);
    if (touchBinding && this.lastSwipe === touchBinding && !this.swipeConsumed) {
      this.swipeConsumed = true;
      // Clear swipe on next frame
      this.scene.time.delayedCall(0, () => {
        if (this.lastSwipe === touchBinding) {
          this.lastSwipe = null;
        }
      });
      return true;
    }
    return false;
  }

  setSwipeThreshold(distance: number, maxTime?: number): void {
    this.swipeThreshold = distance;
    if (maxTime !== undefined) this.swipeMaxTime = maxTime;
  }

  destroy(): void {
    if (this.pointerDownHandler) {
      this.scene.input.off('pointerdown', this.pointerDownHandler);
    }
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
    }
  }
}
