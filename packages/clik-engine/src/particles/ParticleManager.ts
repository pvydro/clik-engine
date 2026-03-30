import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface ParticlePresetConfig {
  key: string;
  frame?: string;
  quantity?: number;
  lifespan?: number;
  speed?: { min: number; max: number };
  scale?: { start: number; end: number };
  alpha?: { start: number; end: number };
  angle?: { min: number; max: number };
  gravityY?: number;
  tint?: number | number[];
  blendMode?: Phaser.BlendModes;
  frequency?: number;
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createEmitter(name: string, config: ParticlePresetConfig): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(0, 0, config.key, {
      frame: config.frame,
      lifespan: config.lifespan ?? 1000,
      speed: config.speed ?? { min: 50, max: 150 },
      scale: config.scale ? { start: config.scale.start, end: config.scale.end } : undefined,
      alpha: config.alpha ? { start: config.alpha.start, end: config.alpha.end } : undefined,
      angle: config.angle ?? { min: 0, max: 360 },
      gravityY: config.gravityY ?? 0,
      tint: config.tint,
      blendMode: config.blendMode ?? Phaser.BlendModes.ADD,
      frequency: config.frequency ?? -1, // -1 = manual emit
      quantity: config.quantity ?? 10,
      emitting: false,
    });

    this.emitters.set(name, emitter);
    ConsoleReporter.engine(`Particle emitter created: ${name}`);
    return emitter;
  }

  /** Emit particles once at a position */
  burst(name: string, x: number, y: number, count?: number): void {
    const emitter = this.emitters.get(name);
    if (!emitter) {
      ConsoleReporter.error(`Particle emitter '${name}' not found`, 'Create it first with createEmitter(name, config).');
      return;
    }
    emitter.setPosition(x, y);
    emitter.explode(count ?? (emitter.quantity as number));
  }

  /** Start continuous emission at position */
  startAt(name: string, x: number, y: number): void {
    const emitter = this.emitters.get(name);
    if (!emitter) return;
    emitter.setPosition(x, y);
    emitter.start();
  }

  /** Attach emitter to follow a game object */
  attachTo(name: string, target: Phaser.GameObjects.GameObject): void {
    const emitter = this.emitters.get(name);
    if (!emitter) return;
    emitter.startFollow(target as unknown as Phaser.Types.Math.Vector2Like);
  }

  stop(name: string): void {
    this.emitters.get(name)?.stop();
  }

  stopAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.stop();
    }
  }

  destroy(name: string): void {
    const emitter = this.emitters.get(name);
    if (emitter) {
      emitter.destroy();
      this.emitters.delete(name);
    }
  }

  destroyAll(): void {
    for (const [name, emitter] of this.emitters) {
      emitter.destroy();
    }
    this.emitters.clear();
  }

  get(name: string): Phaser.GameObjects.Particles.ParticleEmitter | undefined {
    return this.emitters.get(name);
  }
}

/** Pre-built particle effect configs */
export const ParticlePresets = {
  explosion(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 20,
      lifespan: 600,
      speed: { min: 100, max: 300 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
    };
  },

  sparkle(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 8,
      lifespan: 800,
      speed: { min: 20, max: 80 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
      gravityY: -50,
    };
  },

  trail(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 1,
      lifespan: 400,
      speed: { min: 5, max: 20 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.6, end: 0 },
      frequency: 30,
    };
  },

  rain(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 3,
      lifespan: 2000,
      speed: { min: 200, max: 400 },
      scale: { start: 0.2, end: 0.2 },
      alpha: { start: 0.5, end: 0.1 },
      angle: { min: 80, max: 100 },
      frequency: 50,
    };
  },
};
