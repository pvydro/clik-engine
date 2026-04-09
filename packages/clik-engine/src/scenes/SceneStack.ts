import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Stack-based scene management. Push scenes on top (pause below),
 * pop to return to the previous scene. Useful for menus, inventories,
 * pause screens layered over gameplay.
 */
export class SceneStack {
  private game: Phaser.Game;
  private stack: string[] = [];

  constructor(game: Phaser.Game) {
    this.game = game;
  }

  /**
   * Push a scene on top of the stack. The current scene is paused.
   */
  push(sceneKey: string, data?: object): void {
    const current = this.current;
    if (current) {
      const scene = this.game.scene.getScene(current);
      scene?.scene.pause();
      ConsoleReporter.scene(`stack: paused ${current}`);
    }

    this.stack.push(sceneKey);
    this.game.scene.start(sceneKey, data);
    ConsoleReporter.scene(`stack: pushed ${sceneKey} (depth: ${this.stack.length})`);
  }

  /**
   * Pop the top scene. The scene below it is resumed.
   */
  pop(): string | null {
    if (this.stack.length <= 1) {
      ConsoleReporter.error('SceneStack: cannot pop last scene');
      return null;
    }

    const popped = this.stack.pop()!;
    this.game.scene.stop(popped);
    ConsoleReporter.scene(`stack: popped ${popped}`);

    const current = this.current;
    if (current) {
      const scene = this.game.scene.getScene(current);
      scene?.scene.resume();
      ConsoleReporter.scene(`stack: resumed ${current}`);
    }

    return popped;
  }

  /**
   * Replace the top scene with a new one.
   */
  replace(sceneKey: string, data?: object): void {
    if (this.stack.length > 0) {
      const old = this.stack.pop()!;
      this.game.scene.stop(old);
    }
    this.stack.push(sceneKey);
    this.game.scene.start(sceneKey, data);
    ConsoleReporter.scene(`stack: replaced with ${sceneKey}`);
  }

  /**
   * Pop all scenes except the bottom one and resume it.
   */
  popToRoot(): void {
    while (this.stack.length > 1) {
      const popped = this.stack.pop()!;
      this.game.scene.stop(popped);
    }
    const root = this.current;
    if (root) {
      const scene = this.game.scene.getScene(root);
      scene?.scene.resume();
      ConsoleReporter.scene(`stack: popped to root ${root}`);
    }
  }

  /** Get the current (top) scene key */
  get current(): string | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /** Get all scenes in the stack (bottom to top) */
  getStack(): readonly string[] {
    return this.stack;
  }

  /** Get stack depth */
  get depth(): number {
    return this.stack.length;
  }

  /** Check if a scene is in the stack */
  has(sceneKey: string): boolean {
    return this.stack.includes(sceneKey);
  }

  /** Clear the entire stack (stops all scenes) */
  clear(): void {
    for (const key of this.stack) {
      this.game.scene.stop(key);
    }
    this.stack = [];
    ConsoleReporter.scene('stack: cleared');
  }
}
