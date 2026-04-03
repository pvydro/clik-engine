import { describe, it, expect, vi } from 'vitest';
import { ParallaxManager } from '../../src/camera/ParallaxManager';

function makeGameObject(name = 'obj') {
  return {
    name,
    setScrollFactor: vi.fn(),
    setDepth: vi.fn(),
  } as any;
}

describe('ParallaxManager', () => {
  const scene = {} as any;

  it('adds layers and sets scroll factor', () => {
    const pm = new ParallaxManager(scene);
    const obj = makeGameObject();
    pm.addLayer({ name: 'sky', gameObject: obj, scrollFactorX: 0.1 });

    expect(obj.setScrollFactor).toHaveBeenCalledWith(0.1, 0.1);
    expect(pm.layerCount).toBe(1);
  });

  it('removes layers', () => {
    const pm = new ParallaxManager(scene);
    pm.addLayer({ name: 'sky', gameObject: makeGameObject(), scrollFactorX: 0.1 });
    pm.removeLayer('sky');
    expect(pm.layerCount).toBe(0);
  });

  it('setScrollFactor updates existing layer', () => {
    const pm = new ParallaxManager(scene);
    const obj = makeGameObject();
    pm.addLayer({ name: 'bg', gameObject: obj, scrollFactorX: 0.3 });
    pm.setScrollFactor('bg', 0.5, 0.2);

    expect(obj.setScrollFactor).toHaveBeenLastCalledWith(0.5, 0.2);
    const layer = pm.getLayer('bg');
    expect(layer?.scrollFactorX).toBe(0.5);
    expect(layer?.scrollFactorY).toBe(0.2);
  });

  it('getLayerNames returns names sorted by scroll factor', () => {
    const pm = new ParallaxManager(scene);
    pm.addLayer({ name: 'fg', gameObject: makeGameObject(), scrollFactorX: 0.8 });
    pm.addLayer({ name: 'sky', gameObject: makeGameObject(), scrollFactorX: 0.1 });
    pm.addLayer({ name: 'mid', gameObject: makeGameObject(), scrollFactorX: 0.5 });

    const names = pm.getLayerNames();
    expect(names).toEqual(['sky', 'mid', 'fg']);
  });

  it('autoDepth sets depth based on scroll factor order', () => {
    const pm = new ParallaxManager(scene);
    const fg = makeGameObject('fg');
    const sky = makeGameObject('sky');
    pm.addLayer({ name: 'fg', gameObject: fg, scrollFactorX: 0.8 });
    pm.addLayer({ name: 'sky', gameObject: sky, scrollFactorX: 0.1 });

    pm.autoDepth(-10);
    expect(sky.setDepth).toHaveBeenCalledWith(-10); // slower = further back
    expect(fg.setDepth).toHaveBeenCalledWith(-9);
  });

  it('defaults scroll factor Y to X', () => {
    const pm = new ParallaxManager(scene);
    const obj = makeGameObject();
    pm.addLayer({ name: 'bg', gameObject: obj, scrollFactorX: 0.3 });
    expect(obj.setScrollFactor).toHaveBeenCalledWith(0.3, 0.3);
  });

  it('getLayer returns undefined for unknown', () => {
    const pm = new ParallaxManager(scene);
    expect(pm.getLayer('nope')).toBeUndefined();
  });

  it('destroy clears all layers', () => {
    const pm = new ParallaxManager(scene);
    pm.addLayer({ name: 'a', gameObject: makeGameObject() });
    pm.destroy();
    expect(pm.layerCount).toBe(0);
  });
});
