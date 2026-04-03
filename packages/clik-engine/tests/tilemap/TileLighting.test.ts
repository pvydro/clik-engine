import { describe, it, expect } from 'vitest';
import { TileLighting } from '../../src/tilemap/TileLighting';

describe('TileLighting', () => {
  it('starts at zero brightness', () => {
    const lighting = new TileLighting(10, 10);
    expect(lighting.get(5, 5)).toBe(0);
  });

  it('ambient sets base brightness', () => {
    const lighting = new TileLighting(10, 10);
    lighting.setAmbient(0.2);
    lighting.compute();
    expect(lighting.get(5, 5)).toBeCloseTo(0.2, 1);
  });

  it('light source illuminates nearby tiles', () => {
    const lighting = new TileLighting(10, 10);
    lighting.addLight({ x: 5, y: 5, radius: 3, intensity: 1 });
    lighting.compute();

    expect(lighting.get(5, 5)).toBeGreaterThan(0.5); // center = bright
    expect(lighting.get(5, 4)).toBeGreaterThan(0); // adjacent = illuminated
    expect(lighting.get(0, 0)).toBe(0); // far = dark
  });

  it('brightness falls off with distance', () => {
    const lighting = new TileLighting(20, 20);
    lighting.addLight({ x: 10, y: 10, radius: 5, intensity: 1 });
    lighting.compute();

    const center = lighting.get(10, 10);
    const near = lighting.get(11, 10);
    const far = lighting.get(14, 10);

    expect(center).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
  });

  it('opaque tiles block light', () => {
    const lighting = new TileLighting(10, 10);
    lighting.setOpaque(5, 5);
    lighting.addLight({ x: 5, y: 5, radius: 3, intensity: 1 });
    lighting.compute();

    expect(lighting.get(5, 5)).toBe(0); // opaque tile gets no light
  });

  it('multiple lights combine', () => {
    const lighting = new TileLighting(20, 20);
    lighting.addLight({ x: 5, y: 5, radius: 3, intensity: 0.5 });
    lighting.addLight({ x: 7, y: 5, radius: 3, intensity: 0.5 });
    lighting.compute();

    // Overlap zone should be brighter than either light alone at that distance
    const overlap = lighting.get(6, 5);
    expect(overlap).toBeGreaterThan(0.3);
  });

  it('brightness capped at 1', () => {
    const lighting = new TileLighting(10, 10);
    lighting.addLight({ x: 5, y: 5, radius: 5, intensity: 2 });
    lighting.compute();
    expect(lighting.get(5, 5)).toBeLessThanOrEqual(1);
  });

  it('clearLights removes all lights', () => {
    const lighting = new TileLighting(10, 10);
    lighting.addLight({ x: 5, y: 5, radius: 3 });
    lighting.clearLights();
    expect(lighting.lightCount).toBe(0);
  });

  it('setLights replaces all lights', () => {
    const lighting = new TileLighting(10, 10);
    lighting.addLight({ x: 0, y: 0, radius: 1 });
    lighting.setLights([{ x: 5, y: 5, radius: 3 }]);
    expect(lighting.lightCount).toBe(1);
  });

  it('getLightMap returns the grid', () => {
    const lighting = new TileLighting(10, 10);
    const map = lighting.getLightMap();
    expect(map).toBeDefined();
  });

  it('clear resets everything', () => {
    const lighting = new TileLighting(10, 10);
    lighting.setAmbient(0.5);
    lighting.addLight({ x: 5, y: 5, radius: 3 });
    lighting.setOpaque(3, 3);
    lighting.clear();
    expect(lighting.lightCount).toBe(0);
    expect(lighting.get(5, 5)).toBe(0);
  });
});
