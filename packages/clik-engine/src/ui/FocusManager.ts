import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export class FocusManager {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private focusIndex = -1;
  private focusRing: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create focus ring indicator
    this.focusRing = scene.add.rectangle(0, 0, 10, 10, 0x00ff88, 0)
      .setStrokeStyle(2, 0x00ff88, 0.8)
      .setDepth(9500)
      .setVisible(false);

    // Keyboard navigation
    if (scene.input.keyboard) {
      scene.input.keyboard.on('keydown-DOWN', () => this.next());
      scene.input.keyboard.on('keydown-UP', () => this.prev());
      scene.input.keyboard.on('keydown-TAB', (e: KeyboardEvent) => {
        e.preventDefault();
        this.next();
      });
      scene.input.keyboard.on('keydown-ENTER', () => this.activate());
      scene.input.keyboard.on('keydown-SPACE', () => this.activate());
    }
  }

  /** Register a focusable element */
  add(element: Phaser.GameObjects.GameObject): this {
    this.elements.push(element);
    if (this.focusIndex === -1) {
      this.setFocus(0);
    }
    return this;
  }

  /** Register multiple elements in order */
  addAll(elements: Phaser.GameObjects.GameObject[]): this {
    for (const el of elements) this.add(el);
    return this;
  }

  /** Remove an element from focus order */
  remove(element: Phaser.GameObjects.GameObject): this {
    const idx = this.elements.indexOf(element);
    if (idx >= 0) {
      this.elements.splice(idx, 1);
      if (this.focusIndex >= this.elements.length) {
        this.focusIndex = Math.max(0, this.elements.length - 1);
      }
      this.updateFocusRing();
    }
    return this;
  }

  /** Move focus to next element */
  next(): void {
    if (this.elements.length === 0) return;
    this.setFocus((this.focusIndex + 1) % this.elements.length);
  }

  /** Move focus to previous element */
  prev(): void {
    if (this.elements.length === 0) return;
    this.setFocus((this.focusIndex - 1 + this.elements.length) % this.elements.length);
  }

  /** Set focus to a specific index */
  setFocus(index: number): void {
    if (index < 0 || index >= this.elements.length) return;
    this.focusIndex = index;
    this.updateFocusRing();
    ConsoleReporter.input(`focus: index ${index}`);
  }

  /** Activate (click) the currently focused element */
  activate(): void {
    if (this.focusIndex < 0 || this.focusIndex >= this.elements.length) return;
    const element = this.elements[this.focusIndex];
    element.emit('pointerup', { x: 0, y: 0 });
    element.emit('click');
    ConsoleReporter.input('focus: activated');
  }

  /** Get currently focused element */
  getFocused(): Phaser.GameObjects.GameObject | null {
    if (this.focusIndex < 0) return null;
    return this.elements[this.focusIndex] ?? null;
  }

  /** Get focus index */
  getFocusIndex(): number {
    return this.focusIndex;
  }

  private updateFocusRing(): void {
    if (!this.focusRing || this.elements.length === 0 || this.focusIndex < 0) {
      this.focusRing?.setVisible(false);
      return;
    }

    const el = this.elements[this.focusIndex] as unknown as { x: number; y: number; width?: number; height?: number; getBounds?: () => Phaser.Geom.Rectangle };
    if (el.getBounds) {
      const bounds = el.getBounds();
      this.focusRing.setPosition(bounds.centerX, bounds.centerY);
      this.focusRing.setSize(bounds.width + 8, bounds.height + 8);
      this.focusRing.setVisible(true);
    } else if (el.x !== undefined) {
      this.focusRing.setPosition(el.x, el.y);
      this.focusRing.setSize((el.width ?? 100) + 8, (el.height ?? 40) + 8);
      this.focusRing.setVisible(true);
    }
  }

  /** Clear all elements and hide focus ring */
  clear(): void {
    this.elements = [];
    this.focusIndex = -1;
    this.focusRing?.setVisible(false);
  }

  destroy(): void {
    this.clear();
    this.focusRing?.destroy();
    this.focusRing = null;
  }
}
