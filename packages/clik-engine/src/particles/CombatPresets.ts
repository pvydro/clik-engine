import type { GPUEmitterConfig } from './GPUParticles';

/**
 * Pre-built particle configurations for combat effects.
 * Use with GPUParticleEmitter.burst() or GraphicsParticles.
 */
export const CombatParticlePresets = {
  /** Sword slash sparks */
  slashSparks: {
    maxParticles: 30,
    lifetime: 300,
    rate: 0,
    speedMin: 200,
    speedMax: 400,
    sizeMin: 1,
    sizeMax: 3,
    gravity: 200,
    color: 0xffcc44,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Bullet impact sparks */
  bulletSparks: {
    maxParticles: 20,
    lifetime: 200,
    rate: 0,
    speedMin: 150,
    speedMax: 300,
    sizeMin: 1,
    sizeMax: 2,
    gravity: 100,
    color: 0xffaa00,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Dash afterimage trail */
  dashTrail: {
    maxParticles: 50,
    lifetime: 400,
    rate: 100,
    speedMin: 10,
    speedMax: 30,
    sizeMin: 4,
    sizeMax: 8,
    gravity: 0,
    color: 0x4488ff,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Shield break burst */
  shieldBreak: {
    maxParticles: 60,
    lifetime: 500,
    rate: 0,
    speedMin: 100,
    speedMax: 300,
    sizeMin: 2,
    sizeMax: 5,
    gravity: 50,
    color: 0x44ddff,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Healing glow */
  healGlow: {
    maxParticles: 40,
    lifetime: 800,
    rate: 30,
    speedMin: 20,
    speedMax: 60,
    sizeMin: 2,
    sizeMax: 4,
    gravity: -30,
    color: 0x44ff44,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Multi-stage explosion (inner burst) */
  explosionCore: {
    maxParticles: 100,
    lifetime: 300,
    rate: 0,
    speedMin: 200,
    speedMax: 500,
    sizeMin: 3,
    sizeMax: 6,
    gravity: 0,
    color: 0xff6600,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Multi-stage explosion (outer debris) */
  explosionDebris: {
    maxParticles: 50,
    lifetime: 800,
    rate: 0,
    speedMin: 50,
    speedMax: 200,
    sizeMin: 2,
    sizeMax: 4,
    gravity: 300,
    color: 0x884400,
    fadeOut: true,
  } satisfies GPUEmitterConfig,

  /** Blood splatter */
  bloodSplatter: {
    maxParticles: 30,
    lifetime: 400,
    rate: 0,
    speedMin: 100,
    speedMax: 250,
    sizeMin: 2,
    sizeMax: 4,
    gravity: 400,
    color: 0xcc0000,
    fadeOut: true,
  } satisfies GPUEmitterConfig,
} as const;
