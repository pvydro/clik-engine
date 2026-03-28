import Phaser from 'phaser';
import { ActionMap } from './ActionMap';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { InputConfig } from '../utils/types';

interface ActionState {
  isDown: boolean;
  wasDown: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private actionMap: ActionMap;
  private states: Map<string, ActionState> = new Map();
  private keyObjects: Map<string, Phaser.Input.Keyboard.Key[]> = new Map();

  constructor(scene: Phaser.Scene, config?: InputConfig) {
    this.scene = scene;
    this.actionMap = new ActionMap(config);

    for (const action of this.actionMap.allActions()) {
      this.states.set(action, { isDown: false, wasDown: false });

      const keys = this.actionMap.getKeys(action);
      if (keys.length > 0 && scene.input.keyboard) {
        const keyObjs = keys.map(k =>
          scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes] ?? k)
        );
        this.keyObjects.set(action, keyObjs);
      }
    }
  }

  update(): void {
    for (const action of this.actionMap.allActions()) {
      const state = this.states.get(action)!;
      state.wasDown = state.isDown;

      // Check keyboard
      const keys = this.keyObjects.get(action);
      state.isDown = keys?.some(k => k.isDown) ?? false;

      // Log on press
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

  axis(horizontal: string, vertical?: string): { x: number; y: number } {
    return {
      x: this.isDown(horizontal + '_right') ? 1 : this.isDown(horizontal + '_left') ? -1 : 0,
      y: vertical
        ? (this.isDown(vertical + '_down') ? 1 : this.isDown(vertical + '_up') ? -1 : 0)
        : 0,
    };
  }

  getActionMap(): ActionMap {
    return this.actionMap;
  }
}
