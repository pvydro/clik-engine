import { describe, it, expect } from 'vitest';
import { ParticleCollision } from '../../src/particles/ParticleCollision';

describe('ParticleCollision', () => {
  it('bounces particle off floor', () => {
    const collision = new ParticleCollision({ bounce: 0.5, friction: 1 });
    collision.addObstacle({ x: 0, y: 500, width: 800, height: 20 });

    const p = { x: 100, y: 505, vx: 50, vy: 100, size: 2 };
    const hit = collision.resolve(p);

    expect(hit).toBe(true);
    expect(p.vy).toBeLessThan(0); // bounced upward
  });

  it('does not affect particle outside obstacles', () => {
    const collision = new ParticleCollision();
    collision.addObstacle({ x: 0, y: 500, width: 800, height: 20 });

    const p = { x: 100, y: 200, vx: 50, vy: 100, size: 2 };
    const hit = collision.resolve(p);

    expect(hit).toBe(false);
    expect(p.vy).toBe(100); // unchanged
  });

  it('applies friction on bounce', () => {
    const collision = new ParticleCollision({ bounce: 1, friction: 0.5 });
    collision.addObstacle({ x: 0, y: 500, width: 800, height: 20 });

    const p = { x: 100, y: 505, vx: 100, vy: 200, size: 2 };
    collision.resolve(p);

    expect(Math.abs(p.vx)).toBeLessThan(100); // friction reduced horizontal
  });

  it('stops particle below minVelocity', () => {
    const collision = new ParticleCollision({ bounce: 0.01, friction: 0.01, minVelocity: 10 });
    collision.addObstacle({ x: 0, y: 500, width: 800, height: 20 });

    const p = { x: 100, y: 505, vx: 2, vy: 2, size: 2 };
    collision.resolve(p);

    expect(p.vx).toBe(0);
    expect(p.vy).toBe(0);
  });

  it('setObstacles replaces all', () => {
    const collision = new ParticleCollision();
    collision.addObstacle({ x: 0, y: 0, width: 10, height: 10 });
    collision.setObstacles([{ x: 100, y: 100, width: 50, height: 50 }]);
    expect(collision.obstacleCount).toBe(1);
  });

  it('clearObstacles removes all', () => {
    const collision = new ParticleCollision();
    collision.addObstacle({ x: 0, y: 0, width: 10, height: 10 });
    collision.clearObstacles();
    expect(collision.obstacleCount).toBe(0);
  });

  it('resolveAll processes multiple particles', () => {
    const collision = new ParticleCollision({ bounce: 0.5 });
    collision.addObstacle({ x: 0, y: 500, width: 800, height: 20 });

    const particles = [
      { x: 100, y: 505, vx: 0, vy: 100, size: 2 },
      { x: 200, y: 200, vx: 0, vy: 100, size: 2 }, // outside
    ];
    const count = collision.resolveAll(particles);
    expect(count).toBe(1);
  });
});
