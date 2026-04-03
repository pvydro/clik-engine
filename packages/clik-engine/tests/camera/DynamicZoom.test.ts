import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Linear: (a: number, b: number, t: number) => a + (b - a) * t,
    },
  },
}));

import { DynamicZoom } from '../../src/camera/DynamicZoom';

function makeScene() {
  return {
    cameras: {
      main: {
        width: 800,
        height: 600,
        zoom: 1,
        setZoom: vi.fn().mockImplementation(function(this: { zoom: number }, z: number) { this.zoom = z; }),
        centerOn: vi.fn(),
      },
    },
  } as any;
}

describe('DynamicZoom', () => {
  it('does nothing with no targets', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.update();
    expect(scene.cameras.main.centerOn).not.toHaveBeenCalled();
  });

  it('centers on single target', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 400, y: 300 });
    zoom.update();
    expect(scene.cameras.main.centerOn).toHaveBeenCalledWith(400, 300);
  });

  it('centers on weighted average of multiple targets', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 0, y: 0 }, 1);
    zoom.addTarget({ x: 200, y: 0 }, 1);

    zoom.update();
    expect(scene.cameras.main.centerOn).toHaveBeenCalledWith(100, 0);
  });

  it('zooms out to fit spread targets', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene, { minZoom: 0.1, maxZoom: 2, smoothing: 1 });
    zoom.addTarget({ x: 0, y: 0 });
    zoom.addTarget({ x: 1000, y: 0 }); // wide spread

    zoom.update();
    // Should zoom out significantly
    expect(zoom.getZoom()).toBeLessThan(1);
  });

  it('respects maxZoom', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene, { maxZoom: 1.5, smoothing: 1 });
    zoom.addTarget({ x: 400, y: 300 }); // single target = close zoom

    zoom.update();
    expect(zoom.getZoom()).toBeLessThanOrEqual(1.5);
  });

  it('respects minZoom', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene, { minZoom: 0.5, smoothing: 1 });
    zoom.addTarget({ x: -5000, y: 0 });
    zoom.addTarget({ x: 5000, y: 0 }); // massive spread

    zoom.update();
    expect(zoom.getZoom()).toBeGreaterThanOrEqual(0.5);
  });

  it('clearTargets removes all targets', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 100, y: 100 });
    zoom.clearTargets();
    expect(zoom.targetCount).toBe(0);
  });

  it('getCenter returns weighted center', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 0, y: 0 }, 1);
    zoom.addTarget({ x: 100, y: 100 }, 1);
    const center = zoom.getCenter();
    expect(center.x).toBe(50);
    expect(center.y).toBe(50);
  });

  it('weighted targets shift center', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 0, y: 0 }, 1);
    zoom.addTarget({ x: 100, y: 0 }, 3); // 3x weight
    const center = zoom.getCenter();
    expect(center.x).toBe(75); // (0*1 + 100*3) / 4
  });

  it('setTargets replaces all targets', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 0, y: 0 });
    zoom.setTargets([{ position: { x: 50, y: 50 } }]);
    expect(zoom.targetCount).toBe(1);
  });

  it('destroy clears targets', () => {
    const scene = makeScene();
    const zoom = new DynamicZoom(scene);
    zoom.addTarget({ x: 100, y: 100 });
    zoom.destroy();
    expect(zoom.targetCount).toBe(0);
  });
});
