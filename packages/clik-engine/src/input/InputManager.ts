import Phaser from 'phaser';
import { ActionMap } from './ActionMap';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { InputConfig } from '../utils/types';

interface ActionState {
  isDown: boolean;
  wasDown: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  active: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private actionMap: ActionMap;
  private states: Map<string, ActionState> = new Map();
  private keyObjects: Map<string, Phaser.Input.Keyboard.Key[]> = new Map();
  private swipeState: SwipeState = { startX: 0, startY: 0, startTime: 0, active: false };
  private lastSwipe: string | null = null;
  private swipeConsumed = false;
  private gamepadIndex: number | null = null;
  private cachedActions: string[] = [];
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private gamepadConnectedHandler: ((pad: Phaser.Input.Gamepad.Gamepad) => void) | null = null;
  private gamepadDisconnectedHandler: ((pad: Phaser.Input.Gamepad.Gamepad) => void) | null = null;

  // Swipe detection thresholds
  private swipeThreshold = 50;  // minimum distance in pixels
  private swipeMaxTime = 300;   // max time in ms

  constructor(scene: Phaser.Scene, config?: InputConfig) {
    this.scene = scene;
    this.actionMap = new ActionMap(config);

    this.cachedActions = this.actionMap.allActions();

    for (const action of this.cachedActions) {
      this.states.set(action, { isDown: false, wasDown: false });

      const keys = this.actionMap.getKeys(action);
      if (keys.length > 0 && scene.input.keyboard) {
        const keyObjs = keys.map(k =>
          scene.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes] ?? k
          )
        );
        this.keyObjects.set(action, keyObjs);
      }
    }

    // Setup touch/swipe detection
    this.setupTouchInput();

    // Setup gamepad detection
    this.setupGamepad();
  }

  private setupTouchInput(): void {
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
    this.scene.input.on('pointerdown', this.pointerDownHandler);

    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.swipeState.active) return;
      this.swipeState.active = false;

      const dx = pointer.x - this.swipeState.startX;
      const dy = pointer.y - this.swipeState.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = pointer.time - this.swipeState.startTime;

      if (dist < this.swipeThreshold || elapsed > this.swipeMaxTime) {
        // Not a swipe — check if it's a tap
        if (dist < 10 && elapsed < 200) {
          this.lastSwipe = 'tap';
          this.swipeConsumed = false;
        }
        return;
      }

      // Determine swipe direction
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
    this.scene.input.on('pointerup', this.pointerUpHandler);
  }

  private setupGamepad(): void {
    if (!this.scene.input.gamepad) return;

    this.gamepadConnectedHandler = (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepadIndex = pad.index;
      ConsoleReporter.input(`Gamepad connected: ${pad.id}`);
    };
    this.scene.input.gamepad.on('connected', this.gamepadConnectedHandler);

    this.gamepadDisconnectedHandler = (pad: Phaser.Input.Gamepad.Gamepad) => {
      if (this.gamepadIndex === pad.index) {
        this.gamepadIndex = null;
        ConsoleReporter.input(`Gamepad disconnected: ${pad.id}`);
      }
    };
    this.scene.input.gamepad.on('disconnected', this.gamepadDisconnectedHandler);

    // Check for already-connected gamepads
    if (this.scene.input.gamepad.total > 0) {
      this.gamepadIndex = this.scene.input.gamepad.pad1?.index ?? null;
    }
  }

  update(): void {
    const gamepad = this.gamepadIndex !== null
      ? this.scene.input.gamepad?.getPad(this.gamepadIndex)
      : null;

    for (const action of this.cachedActions) {
      const state = this.states.get(action)!;
      state.wasDown = state.isDown;

      let down = false;

      // Check keyboard
      const keys = this.keyObjects.get(action);
      if (keys?.some(k => k.isDown)) {
        down = true;
      }

      // Check touch/swipe gestures
      const touchBinding = this.actionMap.getTouch(action);
      if (touchBinding && this.lastSwipe === touchBinding && !this.swipeConsumed) {
        down = true;
        this.swipeConsumed = true;
        // Swipes are instant — consume immediately on next frame
        this.scene.time.delayedCall(0, () => {
          if (this.lastSwipe === touchBinding) {
            this.lastSwipe = null;
          }
        });
      }

      // Check gamepad
      const gamepadBinding = this.actionMap.getGamepad(action);
      if (gamepad && gamepadBinding) {
        const btnIndex = parseInt(gamepadBinding, 10);
        if (!isNaN(btnIndex) && gamepad.buttons[btnIndex]?.pressed) {
          down = true;
        }
      }

      state.isDown = down;

      if (state.isDown && !state.wasDown) {
        ConsoleReporter.input(`action pressed: ${action}`);
      }
    }
  }

  isDown(action: string): boolean {
    return this.states.get(action)?.isDown ?? false;
  }

  justPressed(action: string): boolean {
    const state = this.states.get(action);
    return state ? state.isDown && !state.wasDown : false;
  }

  justReleased(action: string): boolean {
    const state = this.states.get(action);
    return state ? !state.isDown && state.wasDown : false;
  }

  /**
   * Get axis values from a pair of actions.
   * @param negX Action name for negative X (left)
   * @param posX Action name for positive X (right)
   * @param negY Action name for negative Y (up) — optional
   * @param posY Action name for positive Y (down) — optional
   */
  axis(negX: string, posX: string, negY?: string, posY?: string): { x: number; y: number } {
    let x = 0;
    if (this.isDown(negX)) x -= 1;
    if (this.isDown(posX)) x += 1;

    let y = 0;
    if (negY && this.isDown(negY)) y -= 1;
    if (posY && this.isDown(posY)) y += 1;

    // Add gamepad analog stick
    if (this.gamepadIndex !== null) {
      const gamepad = this.scene.input.gamepad?.getPad(this.gamepadIndex);
      if (gamepad) {
        const stickX = gamepad.leftStick.x;
        const stickY = gamepad.leftStick.y;
        const deadzone = 0.15;
        if (Math.abs(stickX) > deadzone) x = Phaser.Math.Clamp(x + stickX, -1, 1);
        if (Math.abs(stickY) > deadzone) y = Phaser.Math.Clamp(y + stickY, -1, 1);
      }
    }

    return { x, y };
  }

  /** Get the raw pointer position in game coordinates */
  getPointer(): { x: number; y: number; isDown: boolean } {
    const pointer = this.scene.input.activePointer;
    return { x: pointer.worldX, y: pointer.worldY, isDown: pointer.isDown };
  }

  /** Check if a gamepad is connected */
  hasGamepad(): boolean {
    return this.gamepadIndex !== null;
  }

  getActionMap(): ActionMap {
    return this.actionMap;
  }

  /** Configure swipe detection thresholds */
  setSwipeThreshold(distance: number, maxTime?: number): void {
    this.swipeThreshold = distance;
    if (maxTime !== undefined) this.swipeMaxTime = maxTime;
  }

  /** Clean up all event listeners */
  destroy(): void {
    if (this.pointerDownHandler) {
      this.scene.input.off('pointerdown', this.pointerDownHandler);
    }
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
    }
    if (this.scene.input.gamepad) {
      if (this.gamepadConnectedHandler) {
        this.scene.input.gamepad.off('connected', this.gamepadConnectedHandler);
      }
      if (this.gamepadDisconnectedHandler) {
        this.scene.input.gamepad.off('disconnected', this.gamepadDisconnectedHandler);
      }
    }
    if (this.scene.input.keyboard) {
      for (const keys of this.keyObjects.values()) {
        for (const key of keys) {
          this.scene.input.keyboard.removeKey(key, true);
        }
      }
    }
    this.keyObjects.clear();
    this.states.clear();
    this.cachedActions = [];
  }
}
