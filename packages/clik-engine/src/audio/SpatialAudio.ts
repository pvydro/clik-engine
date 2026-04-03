import type { PositionLike } from '../utils/interfaces';

export interface SpatialAudioConfig {
  /** Max audible distance in world pixels */
  maxDistance?: number;
  /** Reference distance for volume falloff (default: 100) */
  refDistance?: number;
  /** Rolloff factor (higher = faster falloff, default: 1) */
  rolloff?: number;
}

export interface SpatialSound {
  key: string;
  position: PositionLike;
  config?: SpatialAudioConfig;
}

/**
 * Position-based audio panning and volume falloff.
 *
 * Usage:
 * ```
 * const spatial = new SpatialAudio(scene, { maxDistance: 500 });
 * spatial.setListener(player);
 * spatial.play('explosion', { x: 300, y: 200 });
 * ```
 */
export class SpatialAudio {
  private scene: Phaser.Scene;
  private listener: PositionLike | null = null;
  private config: Required<SpatialAudioConfig>;

  constructor(scene: Phaser.Scene, config?: SpatialAudioConfig) {
    this.scene = scene;
    this.config = {
      maxDistance: config?.maxDistance ?? 500,
      refDistance: config?.refDistance ?? 100,
      rolloff: config?.rolloff ?? 1,
    };
  }

  /** Set the listener position (usually the player/camera) */
  setListener(position: PositionLike): this {
    this.listener = position;
    return this;
  }

  /** Play a sound at a world position with spatial falloff */
  play(key: string, position: PositionLike, overrideConfig?: Partial<SpatialAudioConfig>): void {
    if (!this.listener) {
      this.scene.sound.play(key);
      return;
    }

    const { volume, pan } = this.compute(position, overrideConfig);
    if (volume <= 0) return; // Too far to hear

    this.scene.sound.play(key, { volume, pan });
  }

  /** Compute volume and pan for a position relative to the listener */
  compute(position: PositionLike, overrideConfig?: Partial<SpatialAudioConfig>): { volume: number; pan: number } {
    if (!this.listener) return { volume: 1, pan: 0 };

    const maxDist = overrideConfig?.maxDistance ?? this.config.maxDistance;
    const refDist = overrideConfig?.refDistance ?? this.config.refDistance;
    const rolloff = overrideConfig?.rolloff ?? this.config.rolloff;

    const dx = position.x - this.listener.x;
    const dy = position.y - this.listener.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= maxDist) return { volume: 0, pan: 0 };

    // Inverse distance falloff
    const volume = Math.min(1, refDist / (refDist + rolloff * Math.max(0, distance - refDist)));

    // Stereo panning: -1 (left) to 1 (right) based on horizontal offset
    const pan = Math.max(-1, Math.min(1, dx / maxDist * 2));

    return { volume, pan };
  }

  /** Get current listener */
  getListener(): PositionLike | null {
    return this.listener;
  }

  /** Update config */
  setConfig(config: Partial<SpatialAudioConfig>): this {
    if (config.maxDistance !== undefined) this.config.maxDistance = config.maxDistance;
    if (config.refDistance !== undefined) this.config.refDistance = config.refDistance;
    if (config.rolloff !== undefined) this.config.rolloff = config.rolloff;
    return this;
  }
}
