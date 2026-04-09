import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Manages a stack of modal dialogs with z-ordering, backdrop interaction,
 * and ESC-to-close behavior.
 */
export class ModalStack {
  private scene: Phaser.Scene;
  private stack: Phaser.GameObjects.Container[] = [];
  private baseDepth = 9000;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // ESC key closes top modal
    if (scene.input.keyboard) {
      this.keyHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.stack.length > 0) {
          this.pop();
        }
      };
      scene.input.keyboard.on('keydown', this.keyHandler);
    }
  }

  /** Push a modal onto the stack. It gets depth-sorted above existing modals. */
  push(modal: Phaser.GameObjects.Container): void {
    const depth = this.baseDepth + this.stack.length * 10;
    modal.setDepth(depth);
    this.stack.push(modal);
    ConsoleReporter.engine(`ModalStack: pushed (${this.stack.length} total)`);
  }

  /** Pop and destroy the top modal. Returns the removed modal or null. */
  pop(): Phaser.GameObjects.Container | null {
    if (this.stack.length === 0) return null;
    const modal = this.stack.pop()!;
    modal.destroy();
    ConsoleReporter.engine(`ModalStack: popped (${this.stack.length} remaining)`);
    return modal;
  }

  /** Close all modals */
  closeAll(): void {
    while (this.stack.length > 0) {
      this.pop();
    }
  }

  /** Get the top modal without removing it */
  getTop(): Phaser.GameObjects.Container | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /** Check if any modal is open */
  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  /** Get count of open modals */
  get count(): number {
    return this.stack.length;
  }

  destroy(): void {
    this.closeAll();
    if (this.keyHandler && this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}
