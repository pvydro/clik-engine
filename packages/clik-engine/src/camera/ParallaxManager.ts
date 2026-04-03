import Phaser from 'phaser';

export interface ParallaxLayerConfig {
  /** Layer name (for management) */
  name: string;
  /** The game object(s) to scroll. Can be a tilemap layer, image, or sprite. */
  gameObject: Phaser.GameObjects.GameObject & { setScrollFactor(x: number, y?: number): void };
  /** Scroll rate relative to camera (0 = fixed, 1 = normal, >1 = foreground) */
  scrollFactorX?: number;
  scrollFactorY?: number;
  /** Auto-tile: if true, repeats the object to fill viewport width + buffer */
  autoTile?: boolean;
}

/**
 * Manages multiple parallax layers with different scroll rates.
 *
 * Usage:
 * ```
 * const parallax = new ParallaxManager(scene);
 * parallax.addLayer({ name: 'sky', gameObject: skyImage, scrollFactorX: 0.1, scrollFactorY: 0.1 });
 * parallax.addLayer({ name: 'mountains', gameObject: mountainsImage, scrollFactorX: 0.3 });
 * parallax.addLayer({ name: 'trees', gameObject: treesImage, scrollFactorX: 0.6 });
 * ```
 */
export class ParallaxManager {
  private scene: Phaser.Scene;
  private layers: Map<string, ParallaxLayerConfig> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Add a parallax layer */
  addLayer(config: ParallaxLayerConfig): this {
    const scrollX = config.scrollFactorX ?? 0.5;
    const scrollY = config.scrollFactorY ?? scrollX;
    config.gameObject.setScrollFactor(scrollX, scrollY);
    this.layers.set(config.name, { ...config, scrollFactorX: scrollX, scrollFactorY: scrollY });
    return this;
  }

  /** Remove a layer by name */
  removeLayer(name: string): this {
    this.layers.delete(name);
    return this;
  }

  /** Update scroll factor for a layer */
  setScrollFactor(name: string, scrollX: number, scrollY?: number): this {
    const layer = this.layers.get(name);
    if (layer) {
      const sy = scrollY ?? scrollX;
      layer.scrollFactorX = scrollX;
      layer.scrollFactorY = sy;
      layer.gameObject.setScrollFactor(scrollX, sy);
    }
    return this;
  }

  /** Get a layer config by name */
  getLayer(name: string): ParallaxLayerConfig | undefined {
    return this.layers.get(name);
  }

  /** Get all layer names ordered by scroll factor (background to foreground) */
  getLayerNames(): string[] {
    return Array.from(this.layers.entries())
      .sort((a, b) => (a[1].scrollFactorX ?? 0) - (b[1].scrollFactorX ?? 0))
      .map(([name]) => name);
  }

  /** Set depth ordering for all layers based on scroll factor (slower = further back) */
  autoDepth(startDepth = -100): this {
    const sorted = Array.from(this.layers.values())
      .sort((a, b) => (a.scrollFactorX ?? 0) - (b.scrollFactorX ?? 0));
    for (let i = 0; i < sorted.length; i++) {
      const go = sorted[i].gameObject as unknown as { setDepth?: (d: number) => void };
      go.setDepth?.(startDepth + i);
    }
    return this;
  }

  get layerCount(): number {
    return this.layers.size;
  }

  destroy(): void {
    this.layers.clear();
  }
}
