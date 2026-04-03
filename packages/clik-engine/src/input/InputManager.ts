import Phaser from 'phaser';
import { ActionMap } from './ActionMap';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { KeyboardProvider } from './providers/KeyboardProvider';
import { TouchProvider } from './providers/TouchProvider';
import { GamepadProvider } from './providers/GamepadProvider';
import type { InputConfig } from '../utils/types';

interface ActionState {
  isDown: boolean;
  wasDown: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private actionMap: ActionMap;
  private states: Map<string, ActionState> = new Map();
  private cachedActions: string[] = [];

  // Input providers
  private keyboard: KeyboardProvider;
  private touch: TouchProvider;
  private gamepad: GamepadProvider;

  constructor(scene: Phaser.Scene, config?: InputConfig) {
    this.scene = scene;
    this.actionMap = new ActionMap(config);
    this.cachedActions = this.actionMap.allActions();

    for (const action of this.cachedActions) {
      this.states.set(action, { isDown: false, wasDown: false });
    }

    // Initialize providers
    this.keyboard = new KeyboardProvider(scene, this.actionMap);
    this.touch = new TouchProvider(scene, this.actionMap);
    this.gamepad = new GamepadProvider(scene, this.actionMap);
  }

  update(): void {
    this.keyboard.update();
    this.touch.update();
    this.gamepad.update();

    for (const action of this.cachedActions) {
      const state = this.states.get(action)!;
      state.wasDown = state.isDown;

      let down = false;

      // Check all providers
      if (this.keyboard.isActionDown(action)) down = true;
      if (this.touch.isActionDown(action)) down = true;
      if (this.touch.consumeAction(action)) down = true;
      if (this.gamepad.isActionDown(action)) down = true;

      state.isDown = down;

      if (state.isDown && !state.wasDown) {
        ConsoleReporter.input(`action pressed: ${action}`);
      }
    }

    // Clear latched pointer state after all actions polled
    this.touch.endFrame();
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
    const stick = this.gamepad.getAxis();
    if (stick.x !== 0) x = Phaser.Math.Clamp(x + stick.x, -1, 1);
    if (stick.y !== 0) y = Phaser.Math.Clamp(y + stick.y, -1, 1);

    return { x, y };
  }

  /** Get the raw pointer position in game coordinates */
  getPointer(): { x: number; y: number; isDown: boolean } {
    const pointer = this.scene.input.activePointer;
    return { x: pointer.worldX, y: pointer.worldY, isDown: pointer.isDown };
  }

  /** Check if a gamepad is connected */
  hasGamepad(): boolean {
    return this.gamepad.hasGamepad();
  }

  getActionMap(): ActionMap {
    return this.actionMap;
  }

  /** Configure swipe detection thresholds */
  setSwipeThreshold(distance: number, maxTime?: number): void {
    this.touch.setSwipeThreshold(distance, maxTime);
  }

  /** Access the keyboard provider directly for advanced use */
  getKeyboardProvider(): KeyboardProvider {
    return this.keyboard;
  }

  /** Access the touch provider directly for advanced use */
  getTouchProvider(): TouchProvider {
    return this.touch;
  }

  /** Access the gamepad provider directly for advanced use */
  getGamepadProvider(): GamepadProvider {
    return this.gamepad;
  }

  /** Clean up all event listeners */
  destroy(): void {
    this.keyboard.destroy();
    this.touch.destroy();
    this.gamepad.destroy();
    this.states.clear();
    this.cachedActions = [];
  }
}
