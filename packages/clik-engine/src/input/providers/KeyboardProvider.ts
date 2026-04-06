import Phaser from 'phaser';
import type { ActionMap } from '../ActionMap';
import type { InputProvider } from './InputProvider';

/**
 * Keyboard input provider — maps Phaser keyboard keys to actions.
 * Binds to game.input.keyboard so keys survive scene transitions.
 */
export class KeyboardProvider implements InputProvider {
  private game: Phaser.Game;
  private actionMap: ActionMap;
  private keyObjects: Map<string, Phaser.Input.Keyboard.Key[]> = new Map();
  private actions: string[];

  constructor(game: Phaser.Game, actionMap: ActionMap) {
    this.game = game;
    this.actionMap = actionMap;
    this.actions = actionMap.allActions();

    for (const action of this.actions) {
      const keys = actionMap.getKeys(action);
      if (keys.length > 0 && game.input.keyboard) {
        const keyObjs = keys.map(k =>
          game.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes] ?? k
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
    if (this.game.input.keyboard) {
      for (const keys of this.keyObjects.values()) {
        for (const key of keys) {
          this.game.input.keyboard.removeKey(key, true);
        }
      }
    }
    this.keyObjects.clear();
  }
}
