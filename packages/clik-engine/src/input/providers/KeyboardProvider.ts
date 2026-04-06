import Phaser from 'phaser';
import type { ActionMap } from '../ActionMap';
import type { InputProvider } from './InputProvider';

/**
 * Keyboard input provider — maps Phaser keyboard keys to actions.
 * Binds to game.input.keyboard so keys survive scene transitions.
 */
export class KeyboardProvider implements InputProvider {
  private actionMap: ActionMap;
  private keyObjects: Map<string, Phaser.Input.Keyboard.Key[]> = new Map();
  private actions: string[];
  private initialized = false;

  constructor(actionMap: ActionMap) {
    this.actionMap = actionMap;
    this.actions = actionMap.allActions();
  }

  /** Bind keys via a scene's keyboard plugin. Rebinds if called with a different scene. */
  initFromScene(scene: Phaser.Scene): void {
    if (!scene.input.keyboard) return;
    // Clear previous bindings — scene may have been replaced by restart
    this.keyObjects.clear();
    this.initialized = true;

    for (const action of this.actions) {
      const keys = this.actionMap.getKeys(action);
      if (keys.length > 0) {
        const keyObjs = keys.map(k =>
          scene.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes] ?? k,
            true,  // enableCapture
            false, // emitOnRepeat
          )
        );
        this.keyObjects.set(action, keyObjs);
      }
    }
  }

  update(): void {
    // Keyboard state is polled directly via key.isDown — no update needed
  }

  isActionDown(action: string): boolean {
    const keys = this.keyObjects.get(action);
    return keys?.some(k => k.isDown) ?? false;
  }

  consumeAction(_action: string): boolean {
    return false; // Keyboard actions are continuous, not one-shot
  }

  destroy(): void {
    this.keyObjects.clear();
    this.initialized = false;
  }
}
