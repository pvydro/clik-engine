import Phaser from 'phaser';
import type { LayoutDirection } from './Panel';

export interface NineSlicePanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Texture key for the panel background sprite. */
  texture: string;
  /** 9-slice insets so the sprite stretches cleanly. */
  nineSlice: { left: number; right: number; top: number; bottom: number };
  /** Optional tint applied to the background sprite. */
  tint?: number;
  /** Background alpha (default `1`). */
  backgroundAlpha?: number;
  /** Inner padding before first child (default `16`). */
  padding?: number;
  /** Gap between children (default `12`). */
  gap?: number;
  /** Auto-layout direction (default `'vertical'`). */
  layout?: LayoutDirection;
}

/**
 * A Panel whose background is a 9-slice sprite instead of a solid-color
 * rectangle.  Supports the same `addItem` / `removeItem` / `clearItems`
 * auto-layout API as {@link Panel}.
 */
export class NineSlicePanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private items: Phaser.GameObjects.GameObject[] = [];
  private panelConfig: NineSlicePanelConfig;

  constructor(scene: Phaser.Scene, config: NineSlicePanelConfig) {
    super(scene, config.x, config.y);
    this.panelConfig = config;

    const ns = config.nineSlice;
    this.bg = scene.add.nineslice(
      0, 0,
      config.texture,
      undefined,
      config.width, config.height,
      ns.left, ns.right, ns.top, ns.bottom,
    )
      .setOrigin(0.5)
      .setAlpha(config.backgroundAlpha ?? 1);

    if (config.tint !== undefined) {
      this.bg.setTint(config.tint);
    }

    this.add(this.bg);
    scene.add.existing(this);
  }

  // ── Child management ──────────────────────────────────────

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

  // ── Resize ────────────────────────────────────────────────

  /** Resize the panel background (re-layouts children). */
  resize(width: number, height: number): this {
    this.panelConfig.width = width;
    this.panelConfig.height = height;
    this.bg.setSize(width, height);
    this.layoutItems();
    return this;
  }

  /** Swap the background texture at runtime. */
  setBackgroundTexture(key: string): this {
    this.bg.setTexture(key);
    return this;
  }

  // ── Layout ────────────────────────────────────────────────

  private layoutItems(): void {
    const padding = this.panelConfig.padding ?? 16;
    const gap = this.panelConfig.gap ?? 12;
    const layout = this.panelConfig.layout ?? 'vertical';
    const { width, height } = this.panelConfig;

    if (layout === 'vertical') {
      const startY = -height / 2 + padding;
      let currentY = startY;
      for (const item of this.items) {
        const go = item as unknown as Phaser.GameObjects.Components.Transform;
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
        const go = item as unknown as Phaser.GameObjects.Components.Transform;
        if (go.setPosition) {
          go.setPosition(currentX, 0);
          const bounds = (item as Phaser.GameObjects.Container).getBounds?.();
          currentX += (bounds?.width ?? 100) + gap;
        }
      }
    }
  }
}
