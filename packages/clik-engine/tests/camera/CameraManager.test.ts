import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), state: vi.fn(), error: vi.fn() },
}));

import { CameraManager } from '../../src/camera/CameraManager';

function makeCamera() {
  return {
    scrollX: 0,
    scrollY: 0,
    width: 800,
    height: 600,
    zoom: 1,
    rotation: 0,
    alpha: 1,
    startFollow: vi.fn(),
    stopFollow: vi.fn(),
    setDeadzone: vi.fn(),
    setBounds: vi.fn(),
    setScroll: vi.fn(),
    setZoom: vi.fn().mockImplementation(function(this: { zoom: number }, z: number) { this.zoom = z; }),
    setRotation: vi.fn().mockImplementation(function(this: { rotation: number }, r: number) { this.rotation = r; }),
    setAlpha: vi.fn(),
    shake: vi.fn((_d: number, _i: number, _r: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
    flash: vi.fn((_d: number, _r: number, _g: number, _b: number, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
    fadeIn: vi.fn((_d: number, _r: number, _g: number, _b: number, cb: (c: unknown, p: number) => void) => cb(null, 1)),
    fadeOut: vi.fn((_d: number, _r: number, _g: number, _b: number, cb: (c: unknown, p: number) => void) => cb(null, 1)),
    zoomTo: vi.fn((_z: number, _d: number, _e: string, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
    pan: vi.fn((_x: number, _y: number, _d: number, _e: string, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
    getWorldPoint: vi.fn((x: number, y: number) => ({ x, y })),
  };
}

function makeScene() {
  const cam = makeCamera();
  return {
    cameras: { main: cam },
    _cam: cam,
  } as unknown as Phaser.Scene & { _cam: ReturnType<typeof makeCamera> };
}

describe('CameraManager', () => {
  let scene: ReturnType<typeof makeScene>;
  let cam: CameraManager;

  beforeEach(() => {
    scene = makeScene();
    cam = new CameraManager(scene);
  });

  it('main returns scene camera', () => {
    expect(cam.main).toBe(scene._cam);
  });

  it('follow calls startFollow with lerp values', () => {
    const target = {} as Phaser.GameObjects.GameObject;
    cam.follow(target, { lerpX: 0.2, lerpY: 0.3 });
    expect(scene._cam.startFollow).toHaveBeenCalledWith(target, false, 0.2, 0.3, undefined, undefined);
  });

  it('follow sets deadzone when provided', () => {
    cam.follow({} as Phaser.GameObjects.GameObject, { deadzone: { width: 100, height: 80 } });
    expect(scene._cam.setDeadzone).toHaveBeenCalledWith(100, 80);
  });

  it('follow returns this', () => {
    expect(cam.follow({} as Phaser.GameObjects.GameObject)).toBe(cam);
  });

  it('stopFollow calls camera.stopFollow', () => {
    cam.stopFollow();
    expect(scene._cam.stopFollow).toHaveBeenCalled();
  });

  it('stopFollow returns this', () => {
    expect(cam.stopFollow()).toBe(cam);
  });

  it('setBounds delegates to camera', () => {
    cam.setBounds(0, 0, 2000, 1500);
    expect(scene._cam.setBounds).toHaveBeenCalledWith(0, 0, 2000, 1500);
  });

  it('setBounds returns this', () => {
    expect(cam.setBounds(0, 0, 1000, 1000)).toBe(cam);
  });

  it('shake resolves when complete', async () => {
    await expect(cam.shake(100, 0.01)).resolves.toBeUndefined();
    expect(scene._cam.shake).toHaveBeenCalled();
  });

  it('flash resolves when complete', async () => {
    await expect(cam.flash()).resolves.toBeUndefined();
  });

  it('fadeIn resolves when complete', async () => {
    await expect(cam.fadeIn()).resolves.toBeUndefined();
  });

  it('fadeOut resolves when complete', async () => {
    await expect(cam.fadeOut()).resolves.toBeUndefined();
  });

  it('zoomTo resolves when complete', async () => {
    await expect(cam.zoomTo(2)).resolves.toBeUndefined();
    expect(scene._cam.zoomTo).toHaveBeenCalled();
  });

  it('panTo resolves when complete', async () => {
    await expect(cam.panTo(400, 300)).resolves.toBeUndefined();
    expect(scene._cam.pan).toHaveBeenCalled();
  });

  it('getZoom returns camera zoom', () => {
    expect(cam.getZoom()).toBe(1);
  });

  it('setRotation delegates and returns this', () => {
    expect(cam.setRotation(0.5)).toBe(cam);
    expect(scene._cam.setRotation).toHaveBeenCalledWith(0.5);
  });

  it('screenToWorld converts via getWorldPoint', () => {
    const result = cam.screenToWorld(100, 200);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('isVisible returns true for on-screen coordinates', () => {
    expect(cam.isVisible(400, 300)).toBe(true);
  });

  it('isVisible returns false for off-screen coordinates', () => {
    expect(cam.isVisible(-999, -999)).toBe(false);
  });

  it('reset calls setScroll, setZoom, setRotation, stopFollow', () => {
    cam.reset();
    expect(scene._cam.setScroll).toHaveBeenCalledWith(0, 0);
    expect(scene._cam.setZoom).toHaveBeenCalledWith(1);
    expect(scene._cam.setRotation).toHaveBeenCalledWith(0);
    expect(scene._cam.stopFollow).toHaveBeenCalled();
  });

  it('reset returns this', () => {
    expect(cam.reset()).toBe(cam);
  });

  it('shakeLight uses lighter settings', async () => {
    await cam.shakeLight();
    expect(scene._cam.shake).toHaveBeenCalledWith(100, 0.005, false, expect.any(Function));
  });

  it('shakeMedium uses medium settings', async () => {
    await cam.shakeMedium();
    expect(scene._cam.shake).toHaveBeenCalledWith(200, 0.01, false, expect.any(Function));
  });

  it('shakeHeavy uses heavy settings', async () => {
    await cam.shakeHeavy();
    expect(scene._cam.shake).toHaveBeenCalledWith(350, 0.02, false, expect.any(Function));
  });

  it('getVisibleBounds returns scroll + dimensions', () => {
    const bounds = cam.getVisibleBounds();
    expect(bounds.width).toBe(800);
    expect(bounds.height).toBe(600);
  });

  it('destroy calls stopFollow', () => {
    cam.destroy();
    expect(scene._cam.stopFollow).toHaveBeenCalled();
  });
});
