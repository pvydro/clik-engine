import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), state: vi.fn(), error: vi.fn() },
}));

import { CameraManager } from '../../src/camera/CameraManager';

function makeCamera() {
  return {
    scrollX: 0, scrollY: 0,
    width: 800, height: 600,
    zoom: 1, rotation: 0, alpha: 1,
    startFollow: vi.fn(), stopFollow: vi.fn(),
    setDeadzone: vi.fn(), setBounds: vi.fn(), removeBounds: vi.fn(),
    setScroll: vi.fn().mockImplementation(function(this: any, x: number, y: number) { this.scrollX = x; this.scrollY = y; }),
    setZoom: vi.fn(), setRotation: vi.fn(), setAlpha: vi.fn(),
    centerOn: vi.fn(),
    zoomTo: vi.fn((...args: any[]) => { const cb = args.find((a: any) => typeof a === 'function'); cb?.(null, 1); }),
    pan: vi.fn((...args: any[]) => { const cb = args.find((a: any) => typeof a === 'function'); cb?.(null, 1); }),
    shake: vi.fn((...args: any[]) => { const cb = args.find((a: any) => typeof a === 'function'); cb?.(null, 1); }),
    flash: vi.fn((...args: any[]) => { const cb = args.find((a: any) => typeof a === 'function'); cb?.(null, 1); }),
    fadeIn: vi.fn((...args: any[]) => { const cb = args.find((a: any) => typeof a === 'function'); cb?.(null, 1); }),
    fadeOut: vi.fn((...args: any[]) => { const cb = args.find((a: any) => typeof a === 'function'); cb?.(null, 1); }),
    getWorldPoint: vi.fn((x: number, y: number) => ({ x, y })),
  };
}

function makeScene() {
  const cam = makeCamera();
  return {
    cameras: { main: cam },
    tweens: {
      addCounter: vi.fn((config: any) => {
        // Simulate tween
        if (config.onComplete) config.onComplete();
        return { stop: vi.fn() };
      }),
    },
    _cam: cam,
  } as any;
}

describe('CameraManager — Prediction', () => {
  let scene: ReturnType<typeof makeScene>;
  let cm: CameraManager;

  beforeEach(() => {
    scene = makeScene();
    cm = new CameraManager(scene);
  });

  it('prediction offset starts at zero', () => {
    cm.enablePrediction();
    expect(cm.getPredictionOffset()).toEqual({ x: 0, y: 0 });
  });

  it('updatePrediction computes offset from velocity', () => {
    cm.enablePrediction({ strength: 1, damping: 1, maxOffset: 500 });

    // First call sets lastTargetPos
    cm.updatePrediction(100, 100, 16);
    // Second call computes velocity
    cm.updatePrediction(200, 100, 16); // moved 100px right in 16ms

    const offset = cm.getPredictionOffset();
    expect(offset.x).toBeGreaterThan(0); // should lead right
  });

  it('disablePrediction clears offset', () => {
    cm.enablePrediction({ strength: 1, damping: 1 });
    cm.updatePrediction(100, 100, 16);
    cm.updatePrediction(200, 100, 16);

    cm.disablePrediction();
    expect(cm.getPredictionOffset()).toEqual({ x: 0, y: 0 });
  });

  it('prediction respects maxOffset', () => {
    cm.enablePrediction({ strength: 1, damping: 1, maxOffset: 50 });
    cm.updatePrediction(0, 0, 16);
    cm.updatePrediction(10000, 0, 16); // enormous velocity

    const offset = cm.getPredictionOffset();
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(50);
  });

  it('does nothing when prediction not enabled', () => {
    cm.updatePrediction(100, 100, 16);
    expect(cm.getPredictionOffset()).toEqual({ x: 0, y: 0 });
  });
});

describe('CameraManager — Directional Shake', () => {
  let scene: ReturnType<typeof makeScene>;
  let cm: CameraManager;

  beforeEach(() => {
    scene = makeScene();
    cm = new CameraManager(scene);
  });

  it('shakeDirectional creates a tween', () => {
    cm.shakeDirectional(1, 0, 200, 10);
    expect(scene.tweens.addCounter).toHaveBeenCalled();
  });

  it('shakeFrom computes direction from world position', () => {
    // Camera center is at (400, 300) based on scrollX=0, width=800
    cm.shakeFrom(0, 300, 200, 10); // from left
    expect(scene.tweens.addCounter).toHaveBeenCalled();
  });
});

describe('CameraManager — Bounds Lock', () => {
  let scene: ReturnType<typeof makeScene>;
  let cm: CameraManager;

  beforeEach(() => {
    scene = makeScene();
    cm = new CameraManager(scene);
  });

  it('lockToBounds sets camera bounds', () => {
    cm.lockToBounds({ x: 0, y: 0, width: 800, height: 600 });
    expect(scene._cam.setBounds).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(cm.getBoundsLock()).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('unlockBounds removes bounds', () => {
    cm.lockToBounds({ x: 0, y: 0, width: 800, height: 600 });
    cm.unlockBounds();
    expect(scene._cam.removeBounds).toHaveBeenCalled();
    expect(cm.getBoundsLock()).toBeNull();
  });

  it('transitionBounds pans then locks', async () => {
    await cm.transitionBounds({ x: 100, y: 100, width: 400, height: 400 }, 500);
    expect(scene._cam.setBounds).toHaveBeenCalledWith(100, 100, 400, 400);
  });

  it('destroy clears prediction and bounds', () => {
    cm.enablePrediction();
    cm.lockToBounds({ x: 0, y: 0, width: 100, height: 100 });
    cm.destroy();
    expect(cm.getBoundsLock()).toBeNull();
  });
});
