import type Phaser from 'phaser';
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
 * Binds lazily via initFromScene() so it survives scene transitions.
 */
export class TouchProvider implements InputProvider {
  private actionMap: ActionMap;
  private swipeState: SwipeState = { startX: 0, startY: 0, startTime: 0, active: false };
  private lastSwipe: string | null = null;
  private swipeConsumed = false;
  private pointerIsDown = false;
  private pointerDownThisFrame = false;
  private pointerX = 0;
  private pointerY = 0;
  private initialized = false;
  private scene: Phaser.Scene | null = null;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  private swipeThreshold: number;
  private swipeMaxTime: number;

  constructor(actionMap: ActionMap, swipeThreshold = 50, swipeMaxTime = 300) {
    this.actionMap = actionMap;
    this.swipeThreshold = swipeThreshold;
    this.swipeMaxTime = swipeMaxTime;
  }

  /** Bind pointer events from a scene's input plugin. Rebinds if called with a different scene. */
  initFromScene(scene: Phaser.Scene): void {
    // Unbind from previous scene if any
    if (this.scene && this.pointerDownHandler) {
      this.scene.input.off('pointerdown', this.pointerDownHandler);
    }
    if (this.scene && this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
    }
    this.initialized = true;
    this.scene = scene;

    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      this.pointerIsDown = true;
      this.pointerDownThisFrame = true;
      this.pointerX = pointer.x;
      this.pointerY = pointer.y;
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
      this.pointerIsDown = false;
      this.pointerX = pointer.x;
      this.pointerY = pointer.y;
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

  update(): void {}

  isActionDown(action: string): boolean {
    const pointerBinding = this.actionMap.getPointer(action);
    if (pointerBinding === 'down' && (this.pointerIsDown || this.pointerDownThisFrame)) return true;
    return false;
  }

  endFrame(): void {
    this.pointerDownThisFrame = false;
  }

  consumeAction(action: string): boolean {
    const touchBinding = this.actionMap.getTouch(action);
    if (touchBinding && this.lastSwipe === touchBinding && !this.swipeConsumed) {
      this.swipeConsumed = true;
      setTimeout(() => {
        if (this.lastSwipe === touchBinding) {
          this.lastSwipe = null;
        }
      }, 0);
      return true;
    }
    return false;
  }

  /** Get current pointer state */
  getPointerState(): { x: number; y: number; isDown: boolean } {
    return { x: this.pointerX, y: this.pointerY, isDown: this.pointerIsDown };
  }

  setSwipeThreshold(distance: number, maxTime?: number): void {
    this.swipeThreshold = distance;
    if (maxTime !== undefined) this.swipeMaxTime = maxTime;
  }

  destroy(): void {
    if (this.scene && this.pointerDownHandler) {
      this.scene.input.off('pointerdown', this.pointerDownHandler);
    }
    if (this.scene && this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
    }
    this.initialized = false;
    this.scene = null;
  }
}
