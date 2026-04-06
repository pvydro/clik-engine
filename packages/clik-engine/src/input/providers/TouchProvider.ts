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
 * Binds to game.input so gestures survive scene transitions.
 */
export class TouchProvider implements InputProvider {
  private game: Phaser.Game;
  private actionMap: ActionMap;
  private swipeState: SwipeState = { startX: 0, startY: 0, startTime: 0, active: false };
  private lastSwipe: string | null = null;
  private swipeConsumed = false;
  private pointerIsDown = false;
  /** Latched flag: set on pointerdown, cleared after InputManager reads it */
  private pointerDownThisFrame = false;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  private swipeThreshold: number;
  private swipeMaxTime: number;

  constructor(game: Phaser.Game, actionMap: ActionMap, swipeThreshold = 50, swipeMaxTime = 300) {
    this.game = game;
    this.actionMap = actionMap;
    this.swipeThreshold = swipeThreshold;
    this.swipeMaxTime = swipeMaxTime;

    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      this.pointerIsDown = true;
      this.pointerDownThisFrame = true;
      this.swipeState = {
        startX: pointer.x,
        startY: pointer.y,
        startTime: pointer.time,
        active: true,
      };
      this.lastSwipe = null;
      this.swipeConsumed = false;
    };
    game.input.on('pointerdown', this.pointerDownHandler);

    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      this.pointerIsDown = false;
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
    game.input.on('pointerup', this.pointerUpHandler);
  }

  update(): void {
    // No-op: state managed via event handlers.
  }

  isActionDown(action: string): boolean {
    // pointer: 'down' binding — true while held OR on the frame it was pressed
    const pointerBinding = this.actionMap.getPointer(action);
    if (pointerBinding === 'down' && (this.pointerIsDown || this.pointerDownThisFrame)) return true;
    return false;
  }

  /** @internal Called by InputManager after all actions have been polled */
  endFrame(): void {
    this.pointerDownThisFrame = false;
  }

  consumeAction(action: string): boolean {
    const touchBinding = this.actionMap.getTouch(action);
    if (touchBinding && this.lastSwipe === touchBinding && !this.swipeConsumed) {
      this.swipeConsumed = true;
      // Clear swipe on next frame via setTimeout (not affected by scene timeScale)
      setTimeout(() => {
        if (this.lastSwipe === touchBinding) {
          this.lastSwipe = null;
        }
      }, 0);
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
      this.game.input.off('pointerdown', this.pointerDownHandler);
    }
    if (this.pointerUpHandler) {
      this.game.input.off('pointerup', this.pointerUpHandler);
    }
  }
}
