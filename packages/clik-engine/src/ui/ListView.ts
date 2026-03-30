import Phaser from 'phaser';
import type { PositionLike } from '../utils/interfaces';

export interface ListViewConfig<T> {
  x: number;
  y: number;
  width: number;
  height: number;
  itemHeight: number;
  backgroundColor?: number;
  /** Called to render each visible item */
  renderItem: (scene: Phaser.Scene, item: T, index: number, x: number, y: number, width: number, height: number) => Phaser.GameObjects.GameObject;
}

/**
 * Virtualized scrolling list — only renders visible items.
 * Handles thousands of items efficiently.
 */
export class ListView<T> extends Phaser.GameObjects.Container {
  private items: T[] = [];
  private renderedItems: Map<number, Phaser.GameObjects.GameObject> = new Map();
  private scrollY = 0;
  private maxScrollY = 0;
  private listConfig: ListViewConfig<T>;
  private isDragging = false;
  private dragStartY = 0;
  private dragScrollStart = 0;
  private velocity = 0;
  private bg: Phaser.GameObjects.Rectangle;
  private maskGraphics: Phaser.GameObjects.Graphics;
  private pointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private pointerUpHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  constructor(scene: Phaser.Scene, config: ListViewConfig<T>) {
    super(scene, config.x, config.y);
    this.listConfig = config;

    this.bg = scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor ?? 0x111111)
      .setOrigin(0).setInteractive();
    this.add(this.bg);

    // Mask for clipping
    this.maskGraphics = scene.make.graphics({});
    this.maskGraphics.fillRect(config.x, config.y, config.width, config.height);
    const mask = this.maskGraphics.createGeometryMask();
    this.setMask(mask);

    // Drag scrolling
    this.bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragScrollStart = this.scrollY;
      this.velocity = 0;
    });

    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = pointer.y - this.dragStartY;
      this.setScroll(this.dragScrollStart - dy);
    };
    scene.input.on('pointermove', this.pointerMoveHandler);

    this.pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.velocity = (this.dragStartY - pointer.y) * 0.5;
    };
    scene.input.on('pointerup', this.pointerUpHandler);

    // Mouse wheel
    this.bg.on('wheel', (_p: Phaser.Input.Pointer, _dx: number, dy: number) => {
      this.setScroll(this.scrollY + dy);
    });

    scene.add.existing(this);
  }

  setItems(items: T[]): this {
    this.items = items;
    this.maxScrollY = Math.max(0, items.length * this.listConfig.itemHeight - this.listConfig.height);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);
    this.renderVisible();
    return this;
  }

  getItems(): T[] {
    return this.items;
  }

  addItem(item: T): this {
    this.items.push(item);
    this.maxScrollY = Math.max(0, this.items.length * this.listConfig.itemHeight - this.listConfig.height);
    this.renderVisible();
    return this;
  }

  removeItem(index: number): this {
    this.items.splice(index, 1);
    this.maxScrollY = Math.max(0, this.items.length * this.listConfig.itemHeight - this.listConfig.height);
    this.renderVisible();
    return this;
  }

  update(): void {
    // Momentum scrolling
    if (!this.isDragging && Math.abs(this.velocity) > 0.5) {
      this.setScroll(this.scrollY + this.velocity * 0.016);
      this.velocity *= 0.92;
    }
  }

  private setScroll(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScrollY);
    this.renderVisible();
  }

  private renderVisible(): void {
    const { itemHeight, width, height } = this.listConfig;
    const startIndex = Math.floor(this.scrollY / itemHeight);
    const endIndex = Math.min(this.items.length - 1, Math.ceil((this.scrollY + height) / itemHeight));

    // Remove items no longer visible
    for (const [idx, obj] of this.renderedItems) {
      if (idx < startIndex || idx > endIndex) {
        obj.destroy();
        this.renderedItems.delete(idx);
      }
    }

    // Render newly visible items
    for (let i = startIndex; i <= endIndex; i++) {
      if (i < 0 || i >= this.items.length) continue;
      if (this.renderedItems.has(i)) {
        // Update position
        const obj = this.renderedItems.get(i)!;
        (obj as unknown as PositionLike).y = i * itemHeight - this.scrollY;
        continue;
      }

      const y = i * itemHeight - this.scrollY;
      const obj = this.listConfig.renderItem(this.scene, this.items[i], i, 0, y, width, itemHeight);
      this.add(obj);
      this.renderedItems.set(i, obj);
    }
  }

  scrollTo(index: number): void {
    this.setScroll(index * this.listConfig.itemHeight);
    this.velocity = 0;
  }

  scrollToTop(): void { this.scrollTo(0); }
  scrollToBottom(): void { this.setScroll(this.maxScrollY); }

  getVisibleRange(): { start: number; end: number } {
    const start = Math.floor(this.scrollY / this.listConfig.itemHeight);
    const end = Math.min(this.items.length - 1, Math.ceil((this.scrollY + this.listConfig.height) / this.listConfig.itemHeight));
    return { start, end };
  }

  get itemCount(): number { return this.items.length; }

  destroy(fromScene?: boolean): void {
    if (this.pointerMoveHandler) {
      this.scene.input.off('pointermove', this.pointerMoveHandler);
    }
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
    }
    for (const obj of this.renderedItems.values()) obj.destroy();
    this.renderedItems.clear();
    this.maskGraphics.destroy();
    super.destroy(fromScene);
  }
}
