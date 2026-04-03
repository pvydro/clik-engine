import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
    },
  },
}));

import { OrbitalCamera } from '../../src/camera/OrbitalCamera';

function makeScene() {
  return {
    cameras: {
      main: {
        scrollX: 0,
        scrollY: 0,
        width: 800,
        height: 600,
        centerOn: vi.fn(),
        startFollow: vi.fn(),
      },
    },
    tweens: {
      add: vi.fn((config: any) => {
        // Simulate tween completion
        if (config.onComplete) config.onComplete();
        return { stop: vi.fn() };
      }),
    },
  } as any;
}

describe('OrbitalCamera', () => {
  let scene: ReturnType<typeof makeScene>;

  beforeEach(() => {
    scene = makeScene();
  });

  it('starts inactive', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 400, centerY: 300, radius: 100,
    });
    expect(orbital.isActive).toBe(false);
  });

  it('orbits when started', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 400, centerY: 300, radius: 100, angularSpeed: Math.PI,
    });
    orbital.start();
    expect(orbital.isActive).toBe(true);

    orbital.update(1000); // 1 second at PI rad/s = PI radians
    expect(scene.cameras.main.centerOn).toHaveBeenCalled();
  });

  it('does not update when inactive', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100,
    });
    orbital.update(1000);
    expect(scene.cameras.main.centerOn).not.toHaveBeenCalled();
  });

  it('stop pauses orbiting', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100,
    });
    orbital.start();
    orbital.stop();
    expect(orbital.isActive).toBe(false);
  });

  it('setCenter changes orbit center', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100, startAngle: 0,
    });
    orbital.setCenter(500, 500);
    orbital.start();
    orbital.update(0.001); // tiny step, angle still ~0

    const call = scene.cameras.main.centerOn.mock.calls[0];
    // At angle ~0, x = center + radius * cos(0) = 500 + 100 = 600
    expect(call[0]).toBeCloseTo(600, 0);
    expect(call[1]).toBeCloseTo(500, 0);
  });

  it('setRadius changes orbit radius', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100, startAngle: 0,
    });
    orbital.setRadius(200);
    orbital.start();
    orbital.update(0.001);

    const call = scene.cameras.main.centerOn.mock.calls[0];
    expect(call[0]).toBeCloseTo(200, 0);
  });

  it('getAngle tracks current angle', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100, angularSpeed: 1, startAngle: 0,
    });
    orbital.start();
    orbital.update(1000); // 1 second at 1 rad/s = 1 radian
    expect(orbital.getAngle()).toBeCloseTo(1, 1);
  });

  it('transitionToFollow starts follow after tween', async () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100,
    });
    orbital.start();

    const target = { x: 200, y: 200 };
    await orbital.transitionToFollow(target as any, 500);

    expect(orbital.isActive).toBe(false);
    expect(scene.cameras.main.startFollow).toHaveBeenCalledWith(target, false, 0.1, 0.1);
  });

  it('destroy deactivates', () => {
    const orbital = new OrbitalCamera(scene, {
      centerX: 0, centerY: 0, radius: 100,
    });
    orbital.start();
    orbital.destroy();
    expect(orbital.isActive).toBe(false);
  });
});
