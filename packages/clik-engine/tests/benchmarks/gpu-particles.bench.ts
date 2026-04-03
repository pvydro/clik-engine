import { describe, bench, beforeEach } from 'vitest';
import { makeBenchScene } from './setup';
import { GPUParticleEmitter } from '../../src/particles/GPUParticles';

describe('GPU Particle Benchmarks', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeBenchScene();
  });

  bench('update 1K particles', () => {
    const emitter = new GPUParticleEmitter(scene, {
      maxParticles: 1000,
      lifetime: 2000,
      rate: 0,
    });
    emitter.start();
    emitter.burst(1000, 400, 300);
    emitter.update(16.67);
    emitter.destroy();
  });

  bench('update 5K particles', () => {
    const emitter = new GPUParticleEmitter(scene, {
      maxParticles: 5000,
      lifetime: 2000,
      rate: 0,
    });
    emitter.start();
    emitter.burst(5000, 400, 300);
    emitter.update(16.67);
    emitter.destroy();
  });

  bench('update 10K particles', () => {
    const emitter = new GPUParticleEmitter(scene, {
      maxParticles: 10000,
      lifetime: 2000,
      rate: 0,
    });
    emitter.start();
    emitter.burst(10000, 400, 300);
    emitter.update(16.67);
    emitter.destroy();
  });

  bench('update 10K particles with gravity', () => {
    const emitter = new GPUParticleEmitter(scene, {
      maxParticles: 10000,
      lifetime: 2000,
      rate: 0,
      gravity: 500,
    });
    emitter.start();
    emitter.burst(10000, 400, 300);
    emitter.update(16.67);
    emitter.destroy();
  });

  bench('sustained emission 5K at rate=5000', () => {
    const emitter = new GPUParticleEmitter(scene, {
      maxParticles: 5000,
      lifetime: 2000,
      rate: 5000,
    });
    emitter.setPosition(400, 300);
    emitter.start();
    // Simulate 10 frames of sustained emission
    for (let i = 0; i < 10; i++) {
      emitter.update(16.67);
    }
    emitter.destroy();
  });
});
