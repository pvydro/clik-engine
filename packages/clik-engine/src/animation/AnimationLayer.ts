import Phaser from 'phaser';

export type LayerBlendMode = 'override' | 'additive';

export interface LayerConfig {
  /** Layer name */
  name: string;
  /** The sprite this layer controls */
  sprite: Phaser.GameObjects.Sprite;
  /** Blend mode: override replaces, additive blends on top */
  blendMode?: LayerBlendMode;
  /** Weight of this layer (0-1) */
  weight?: number;
}

/**
 * Manages multiple animation layers on an entity.
 * Each layer targets a different sprite (e.g., legs, torso, face).
 *
 * Usage:
 * ```
 * const layers = new AnimationLayerStack();
 * layers.addLayer({ name: 'legs', sprite: legsSprite });
 * layers.addLayer({ name: 'torso', sprite: torsoSprite });
 * layers.play('legs', 'run');
 * layers.play('torso', 'aim_up');
 * ```
 */
export class AnimationLayerStack {
  private layers: Map<string, LayerState> = new Map();

  /** Add a layer */
  addLayer(config: LayerConfig): this {
    this.layers.set(config.name, {
      sprite: config.sprite,
      blendMode: config.blendMode ?? 'override',
      weight: config.weight ?? 1,
      currentAnim: null,
    });
    return this;
  }

  /** Remove a layer */
  removeLayer(name: string): this {
    this.layers.delete(name);
    return this;
  }

  /** Play an animation on a specific layer */
  play(layerName: string, animKey: string, ignoreIfPlaying = true): this {
    const layer = this.layers.get(layerName);
    if (!layer) return this;

    if (ignoreIfPlaying && layer.currentAnim === animKey && layer.sprite.anims.isPlaying) {
      return this;
    }

    layer.sprite.play(animKey, ignoreIfPlaying);
    layer.sprite.setAlpha(layer.weight);
    layer.currentAnim = animKey;
    return this;
  }

  /** Stop animation on a layer */
  stop(layerName: string): this {
    const layer = this.layers.get(layerName);
    if (!layer) return this;
    layer.sprite.stop();
    layer.currentAnim = null;
    return this;
  }

  /** Set the weight of a layer (0-1) */
  setWeight(layerName: string, weight: number): this {
    const layer = this.layers.get(layerName);
    if (!layer) return this;
    layer.weight = Math.max(0, Math.min(1, weight));
    layer.sprite.setAlpha(layer.weight);
    return this;
  }

  /** Get current weight of a layer */
  getWeight(layerName: string): number {
    return this.layers.get(layerName)?.weight ?? 0;
  }

  /** Get blend mode of a layer */
  getBlendMode(layerName: string): LayerBlendMode | undefined {
    return this.layers.get(layerName)?.blendMode;
  }

  /** Get current animation on a layer */
  getCurrentAnim(layerName: string): string | null {
    return this.layers.get(layerName)?.currentAnim ?? null;
  }

  /** Check if a layer is playing */
  isPlaying(layerName: string): boolean {
    const layer = this.layers.get(layerName);
    return layer ? layer.sprite.anims.isPlaying : false;
  }

  /** Get all layer names */
  getLayerNames(): string[] {
    return Array.from(this.layers.keys());
  }

  /** Stop all layers */
  stopAll(): void {
    for (const layer of this.layers.values()) {
      layer.sprite.stop();
      layer.currentAnim = null;
    }
  }

  /** Destroy all layers */
  destroy(): void {
    this.stopAll();
    this.layers.clear();
  }
}

interface LayerState {
  sprite: Phaser.GameObjects.Sprite;
  blendMode: LayerBlendMode;
  weight: number;
  currentAnim: string | null;
}
