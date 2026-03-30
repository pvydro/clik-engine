import Phaser from 'phaser';
import type { TransformLike } from '../utils/interfaces';

export type LayoutDirection = 'vertical' | 'horizontal';

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  padding?: number;
  gap?: number;
  layout?: LayoutDirection;
}

export class Panel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private items: Phaser.GameObjects.GameObject[] = [];
  private panelConfig: PanelConfig;

  constructor(scene: Phaser.Scene, config: PanelConfig) {
    super(scene, config.x, config.y);
    this.panelConfig = config;

    this.bg = scene.add.rectangle(0, 0, config.width, config.height, config.backgroundColor ?? 0x111111, config.backgroundAlpha ?? 0.9)
      .setOrigin(0.5);

    this.add(this.bg);
    scene.add.existing(this);
  }

  addItem(item: Phaser.GameObjects.GameObject): this {
    this.items.push(item);
    this.add(item);
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
      this.remove(item);
    }
    this.items = [];
    return this;
  }

  private layoutItems(): void {
    const padding = this.panelConfig.padding ?? 16;
    const gap = this.panelConfig.gap ?? 12;
    const layout = this.panelConfig.layout ?? 'vertical';
    const { width, height } = this.panelConfig;

    if (layout === 'vertical') {
      const startY = -height / 2 + padding;
      let currentY = startY;
      for (const item of this.items) {
        const go = item as unknown as TransformLike;
        if (go.setPosition) {
          go.setPosition(0, currentY);
          const bounds = (item as Phaser.GameObjects.Container).getBounds?.();
          currentY += (bounds?.height ?? 40) + gap;
        }
      }
    } else {
      const startX = -width / 2 + padding;
      let currentX = startX;
      for (const item of this.items) {
        const go = item as unknown as TransformLike;
        if (go.setPosition) {
          go.setPosition(currentX, 0);
          const bounds = (item as Phaser.GameObjects.Container).getBounds?.();
          currentX += (bounds?.width ?? 100) + gap;
        }
      }
    }
  }
}
