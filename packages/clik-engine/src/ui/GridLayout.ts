import Phaser from 'phaser';
import type { TransformLike } from '../utils/interfaces';

export interface GridLayoutConfig {
  x: number;
  y: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap?: number;
  padding?: number;
}

export class GridLayout extends Phaser.GameObjects.Container {
  private items: Phaser.GameObjects.GameObject[] = [];
  private gridConfig: GridLayoutConfig;

  constructor(scene: Phaser.Scene, config: GridLayoutConfig) {
    super(scene, config.x, config.y);
    this.gridConfig = config;
    scene.add.existing(this);
  }

  addItem(item: Phaser.GameObjects.GameObject): this {
    this.items.push(item);
    this.add(item);
    this.layoutItems();
    return this;
  }

  addItems(items: Phaser.GameObjects.GameObject[]): this {
    for (const item of items) {
      this.items.push(item);
      this.add(item);
    }
    this.layoutItems();
    return this;
  }

  removeItem(item: Phaser.GameObjects.GameObject): this {
    const idx = this.items.indexOf(item);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      this.remove(item);
      this.layoutItems();
    }
    return this;
  }

  clearItems(): this {
    for (const item of this.items) {
      this.remove(item, true);
    }
    this.items = [];
    return this;
  }

  private layoutItems(): void {
    const { columns, cellWidth, cellHeight, gap = 8, padding = 0 } = this.gridConfig;

    for (let i = 0; i < this.items.length; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = padding + col * (cellWidth + gap) + cellWidth / 2;
      const y = padding + row * (cellHeight + gap) + cellHeight / 2;

      const go = this.items[i] as unknown as TransformLike;
      if (go.setPosition) {
        go.setPosition(x, y);
      }
    }
  }

  getItemAt(col: number, row: number): Phaser.GameObjects.GameObject | undefined {
    const idx = row * this.gridConfig.columns + col;
    return this.items[idx];
  }

  get rowCount(): number {
    return Math.ceil(this.items.length / this.gridConfig.columns);
  }

  get totalWidth(): number {
    const { columns, cellWidth, gap = 8, padding = 0 } = this.gridConfig;
    return padding * 2 + columns * cellWidth + (columns - 1) * gap;
  }

  get totalHeight(): number {
    const { cellHeight, gap = 8, padding = 0 } = this.gridConfig;
    return padding * 2 + this.rowCount * cellHeight + Math.max(0, this.rowCount - 1) * gap;
  }
}
