import type { ParticlePresetConfig } from './ParticleManager';

/**
 * Extended particle effect presets for common game scenarios.
 * Each returns a ParticlePresetConfig for use with ParticleManager.createEmitter().
 */
export const AdvancedParticlePresets = {
  fire(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 5,
      lifespan: 800,
      speed: { min: 20, max: 60 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      angle: { min: 250, max: 290 },
      tint: [0xff4400, 0xff8800, 0xffcc00],
      gravityY: -50,
      frequency: 30,
    };
  },

  smoke(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 2,
      lifespan: 2000,
      speed: { min: 10, max: 30 },
      scale: { start: 0.3, end: 1.2 },
      alpha: { start: 0.4, end: 0 },
      angle: { min: 250, max: 290 },
      tint: 0x888888,
      gravityY: -20,
      frequency: 80,
    };
  },

  snow(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 1,
      lifespan: 5000,
      speed: { min: 20, max: 50 },
      scale: { start: 0.15, end: 0.15 },
      alpha: { start: 0.8, end: 0.2 },
      angle: { min: 80, max: 100 },
      gravityY: 30,
      frequency: 100,
    };
  },

  confetti(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 30,
      lifespan: 3000,
      speed: { min: 100, max: 300 },
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 1, end: 0.3 },
      angle: { min: 240, max: 300 },
      tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff],
      gravityY: 100,
    };
  },

  dust(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 8,
      lifespan: 600,
      speed: { min: 30, max: 80 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.5, end: 0 },
      angle: { min: 200, max: 340 },
      tint: 0xccaa88,
    };
  },

  magic(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 12,
      lifespan: 1200,
      speed: { min: 20, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
      tint: [0x8800ff, 0x00ffff, 0xff88ff],
      gravityY: -30,
    };
  },

  lightning(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 15,
      lifespan: 200,
      speed: { min: 200, max: 500 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      angle: { min: 0, max: 360 },
      tint: [0xffffff, 0xccddff, 0x8888ff],
    };
  },

  blood(textureKey: string): ParticlePresetConfig {
    return {
      key: textureKey,
      quantity: 10,
      lifespan: 800,
      speed: { min: 50, max: 200 },
      scale: { start: 0.3, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      angle: { min: 0, max: 360 },
      tint: [0xcc0000, 0x880000, 0xff2200],
      gravityY: 200,
    };
  },
};
