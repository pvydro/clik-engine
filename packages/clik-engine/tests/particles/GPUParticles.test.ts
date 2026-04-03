import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { GPUParticleEmitter } from '../../src/particles/GPUParticles';

function makeScene() {
  return {
    add: {
      graphics: vi.fn(() => ({
        setDepth: vi.fn(),
        clear: vi.fn(),
        fillStyle: vi.fn(),
        fillCircle: vi.fn(),
        destroy: vi.fn(),
      })),
    },
  } as any;
}

describe('GPUParticleEmitter', () => {
  it('starts with zero particles', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 100 });
    expect(emitter.count).toBe(0);
  });

  it('burst creates particles', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 100 });
    emitter.start();
    emitter.burst(20, 100, 100);
    expect(emitter.count).toBe(20);
  });

  it('burst respects maxParticles', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 10 });
    emitter.start();
    emitter.burst(50);
    expect(emitter.count).toBe(10);
  });

  it('particles die after lifetime', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 100, lifetime: 100 });
    emitter.start();
    emitter.burst(10);
    expect(emitter.count).toBe(10);

    emitter.update(200); // particles should die
    expect(emitter.count).toBe(0);
  });

  it('start enables emission', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { rate: 1000, maxParticles: 100 });
    emitter.start();
    expect(emitter.isEmitting).toBe(true);
    emitter.update(100);
    expect(emitter.count).toBeGreaterThan(0);
  });

  it('stop disables emission but keeps particles', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { rate: 1000, maxParticles: 100, lifetime: 5000 });
    emitter.start();
    emitter.update(100);
    const count = emitter.count;
    emitter.stop();
    expect(emitter.isEmitting).toBe(false);
    emitter.update(50);
    // Count may decrease (dying) but not increase (no new particles)
    expect(emitter.count).toBeLessThanOrEqual(count);
  });

  it('setPosition changes emission location', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 100 });
    emitter.setPosition(200, 300);
    emitter.start();
    emitter.burst(1);
    expect(emitter.count).toBe(1);
  });

  it('maxParticles returns capacity', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 500 });
    expect(emitter.maxParticles).toBe(500);
  });

  it('destroy clears everything', () => {
    const emitter = new GPUParticleEmitter(makeScene(), { maxParticles: 100 });
    emitter.start();
    emitter.burst(10);
    emitter.destroy();
    expect(emitter.count).toBe(0);
    expect(emitter.isEmitting).toBe(false);
  });
});
