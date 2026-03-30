import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { error: vi.fn(), engine: vi.fn() },
}));

import { ConsoleReporter } from '../../src/debug/ConsoleReporter';
import { PhysicsBody } from '../../src/physics/PhysicsBody';

// --- Mock Arcade body ---
const makeBody = (overrides: Record<string, unknown> = {}) => ({
  setVelocity: vi.fn(),
  setVelocityX: vi.fn(),
  setVelocityY: vi.fn(),
  setMaxVelocity: vi.fn(),
  setDrag: vi.fn(),
  setBounce: vi.fn(),
  setFriction: vi.fn(),
  setGravityY: vi.fn(),
  setCircle: vi.fn(),
  setSize: vi.fn(),
  setOffset: vi.fn(),
  setCollideWorldBounds: vi.fn(),
  reset: vi.fn(),
  velocity: { x: 0, y: 0 },
  allowGravity: true,
  immovable: false,
  moves: true,
  blocked: { down: false, up: false, left: false, right: false },
  ...overrides,
});

const makeScene = (body: ReturnType<typeof makeBody>) => ({
  physics: {
    add: {
      existing: vi.fn((_obj: unknown) => {
        // Attach the mock body to the object
        (_obj as Record<string, unknown>).body = body;
      }),
    },
  },
} as unknown as Phaser.Scene);

const makeObj = () => ({
  body: undefined as unknown,
} as unknown as Phaser.GameObjects.GameObject);

describe('PhysicsBody', () => {
  let body: ReturnType<typeof makeBody>;
  let scene: Phaser.Scene;
  let obj: Phaser.GameObjects.GameObject;

  beforeEach(() => {
    body = makeBody();
    scene = makeScene(body);
    obj = makeObj();
  });

  it('calls scene.physics.add.existing on construction', () => {
    new PhysicsBody(scene, obj);
    expect(scene.physics.add.existing).toHaveBeenCalledWith(obj, false);
  });

  it('creates a static body when isStatic is true', () => {
    new PhysicsBody(scene, obj, { isStatic: true });
    expect(scene.physics.add.existing).toHaveBeenCalledWith(obj, true);
  });

  it('applies initial velocity config', () => {
    new PhysicsBody(scene, obj, { velocity: { x: 100, y: -50 } });
    expect(body.setVelocity).toHaveBeenCalledWith(100, -50);
  });

  it('warns when velocity is set on a static body', () => {
    new PhysicsBody(scene, obj, { isStatic: true, velocity: { x: 100, y: 0 } });
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining('static body'),
      expect.any(String),
    );
  });

  it('does NOT apply velocity when isStatic is true', () => {
    new PhysicsBody(scene, obj, { isStatic: true, velocity: { x: 100, y: 0 } });
    expect(body.setVelocity).not.toHaveBeenCalled();
  });

  it('applies drag config (number shorthand)', () => {
    new PhysicsBody(scene, obj, { drag: 300 });
    expect(body.setDrag).toHaveBeenCalledWith(300, 300);
  });

  it('applies drag config (object)', () => {
    new PhysicsBody(scene, obj, { drag: { x: 200, y: 100 } });
    expect(body.setDrag).toHaveBeenCalledWith(200, 100);
  });

  it('applies bounce config', () => {
    new PhysicsBody(scene, obj, { bounce: 0.5 });
    expect(body.setBounce).toHaveBeenCalledWith(0.5, 0.5);
  });

  it('applies bodySize config', () => {
    new PhysicsBody(scene, obj, { bodySize: { width: 20, height: 30 } });
    expect(body.setSize).toHaveBeenCalledWith(20, 30);
    expect(body.setOffset).toHaveBeenCalledWith(0, 0);
  });

  it('applies bodySize config with offset', () => {
    new PhysicsBody(scene, obj, { bodySize: { width: 20, height: 30, offsetX: 5, offsetY: 10 } });
    expect(body.setSize).toHaveBeenCalledWith(20, 30);
    expect(body.setOffset).toHaveBeenCalledWith(5, 10);
  });

  it('applies circleRadius config', () => {
    new PhysicsBody(scene, obj, { circleRadius: 16 });
    expect(body.setCircle).toHaveBeenCalledWith(16);
  });

  it('sets collideWorldBounds', () => {
    new PhysicsBody(scene, obj, { collideWorldBounds: true });
    expect(body.setCollideWorldBounds).toHaveBeenCalledWith(true);
  });

  it('exposes raw body', () => {
    const pb = new PhysicsBody(scene, obj);
    expect(pb.raw).toBe(body);
  });

  it('exposes isStatic flag', () => {
    const pb = new PhysicsBody(scene, obj, { isStatic: true });
    expect(pb.isStatic).toBe(true);
  });

  describe('fluent setters', () => {
    it('setVelocity chains and calls body', () => {
      const pb = new PhysicsBody(scene, obj);
      const result = pb.setVelocity(50, 80);
      expect(result).toBe(pb);
      expect(body.setVelocity).toHaveBeenCalledWith(50, 80);
    });

    it('setVelocity warns on static body', () => {
      const pb = new PhysicsBody(scene, obj, { isStatic: true });
      (ConsoleReporter.error as ReturnType<typeof vi.fn>).mockClear();
      pb.setVelocity(50, 0);
      expect(ConsoleReporter.error).toHaveBeenCalled();
    });

    it('setVelocityX chains', () => {
      const pb = new PhysicsBody(scene, obj);
      expect(pb.setVelocityX(100)).toBe(pb);
      expect(body.setVelocityX).toHaveBeenCalledWith(100);
    });

    it('setVelocityY chains', () => {
      const pb = new PhysicsBody(scene, obj);
      expect(pb.setVelocityY(-200)).toBe(pb);
      expect(body.setVelocityY).toHaveBeenCalledWith(-200);
    });

    it('setMaxVelocity uses y=x default', () => {
      const pb = new PhysicsBody(scene, obj);
      pb.setMaxVelocity(400);
      expect(body.setMaxVelocity).toHaveBeenCalledWith(400, 400);
    });

    it('setDrag uses y=x default', () => {
      const pb = new PhysicsBody(scene, obj);
      pb.setDrag(100);
      expect(body.setDrag).toHaveBeenCalledWith(100, 100);
    });

    it('setBounce uses y=x default', () => {
      const pb = new PhysicsBody(scene, obj);
      pb.setBounce(0.3);
      expect(body.setBounce).toHaveBeenCalledWith(0.3, 0.3);
    });

    it('impulse adds to velocity', () => {
      body.velocity = { x: 100, y: 0 };
      const pb = new PhysicsBody(scene, obj);
      const result = pb.impulse(50, -30);
      expect(result).toBe(pb);
      expect(body.velocity.x).toBe(150);
      expect(body.velocity.y).toBe(-30);
    });

    it('setBodySize chains', () => {
      const pb = new PhysicsBody(scene, obj);
      body.setSize = vi.fn();
      body.setOffset = vi.fn();
      expect(pb.setBodySize(24, 32, 4, 8)).toBe(pb);
      expect(body.setSize).toHaveBeenCalledWith(24, 32);
      expect(body.setOffset).toHaveBeenCalledWith(4, 8);
    });

    it('setCircle chains', () => {
      const pb = new PhysicsBody(scene, obj);
      expect(pb.setCircle(16, 2, 4)).toBe(pb);
      expect(body.setCircle).toHaveBeenCalledWith(16, 2, 4);
    });
  });

  describe('state queries', () => {
    it('isOnFloor reads blocked.down', () => {
      body.blocked.down = true;
      const pb = new PhysicsBody(scene, obj);
      expect(pb.isOnFloor).toBe(true);
    });

    it('isOnCeiling reads blocked.up', () => {
      body.blocked.up = true;
      const pb = new PhysicsBody(scene, obj);
      expect(pb.isOnCeiling).toBe(true);
    });

    it('isOnLeftWall reads blocked.left', () => {
      body.blocked.left = true;
      const pb = new PhysicsBody(scene, obj);
      expect(pb.isOnLeftWall).toBe(true);
    });

    it('isOnRightWall reads blocked.right', () => {
      body.blocked.right = true;
      const pb = new PhysicsBody(scene, obj);
      expect(pb.isOnRightWall).toBe(true);
    });
  });

  describe('PhysicsBody.from()', () => {
    it('returns null when object has no body', () => {
      expect(PhysicsBody.from({} as Phaser.GameObjects.GameObject)).toBeNull();
    });

    it('wraps existing body', () => {
      const existingBody = makeBody({ moves: true });
      const existingObj = { body: existingBody } as unknown as Phaser.GameObjects.GameObject;
      const pb = PhysicsBody.from(existingObj);
      expect(pb).not.toBeNull();
      expect(pb!.raw).toBe(existingBody);
    });

    it('detects static body (moves = false)', () => {
      const staticBody = makeBody({ moves: false });
      const staticObj = { body: staticBody } as unknown as Phaser.GameObjects.GameObject;
      const pb = PhysicsBody.from(staticObj);
      expect(pb!.isStatic).toBe(true);
    });
  });
});
