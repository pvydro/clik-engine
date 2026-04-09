import type Phaser from 'phaser';

export interface SoundPoolConfig {
  /** Number of pre-allocated instances per key */
  poolSize?: number;
  /** If all instances are playing, steal the oldest? */
  voiceStealing?: boolean;
}

interface PooledSound {
  instance: Phaser.Sound.BaseSound;
  startTime: number;
  playing: boolean;
}

/**
 * Pre-allocated sound instances for simultaneous playback without allocation.
 * Supports voice stealing when all instances are busy.
 *
 * Usage:
 * ```
 * const pool = new SoundPool(scene, { poolSize: 5, voiceStealing: true });
 * pool.register('hit', 'hit_sfx');
 * pool.play('hit', { volume: 0.8 });
 * ```
 */
export class SoundPool {
  private scene: Phaser.Scene;
  private config: Required<SoundPoolConfig>;
  private pools: Map<string, PooledSound[]> = new Map();

  constructor(scene: Phaser.Scene, config?: SoundPoolConfig) {
    this.scene = scene;
    this.config = {
      poolSize: config?.poolSize ?? 5,
      voiceStealing: config?.voiceStealing ?? true,
    };
  }

  /** Register a sound key and pre-allocate instances */
  register(name: string, soundKey: string): this {
    const pool: PooledSound[] = [];
    for (let i = 0; i < this.config.poolSize; i++) {
      pool.push({
        instance: this.scene.sound.add(soundKey),
        startTime: 0,
        playing: false,
      });
    }
    this.pools.set(name, pool);
    return this;
  }

  /** Play a pooled sound. Returns true if played. */
  play(name: string, config?: Phaser.Types.Sound.SoundConfig): boolean {
    const pool = this.pools.get(name);
    if (!pool) return false;

    // Find a free instance
    let target = pool.find(s => !s.playing);

    if (!target) {
      if (!this.config.voiceStealing) return false;
      // Steal the oldest playing instance
      target = pool.reduce((oldest, s) =>
        s.startTime < oldest.startTime ? s : oldest
      );
      target.instance.stop();
    }

    target.instance.play(config);
    target.playing = true;
    target.startTime = Date.now();

    // Track completion
    target.instance.once('complete', () => { target!.playing = false; });

    return true;
  }

  /** Stop all instances of a sound */
  stop(name: string): void {
    const pool = this.pools.get(name);
    if (!pool) return;
    for (const s of pool) {
      s.instance.stop();
      s.playing = false;
    }
  }

  /** Stop all sounds in all pools */
  stopAll(): void {
    for (const pool of this.pools.values()) {
      for (const s of pool) {
        s.instance.stop();
        s.playing = false;
      }
    }
  }

  /** Get how many instances are currently playing */
  getActiveCount(name: string): number {
    const pool = this.pools.get(name);
    if (!pool) return 0;
    return pool.filter(s => s.playing).length;
  }

  /** Get all registered sound names */
  getRegistered(): string[] {
    return Array.from(this.pools.keys());
  }

  /** Destroy all pool instances */
  destroy(): void {
    for (const pool of this.pools.values()) {
      for (const s of pool) s.instance.destroy();
    }
    this.pools.clear();
  }
}
