import { describe, it, expect } from 'vitest';
import { ColorGradingPresets } from '../../src/effects/ColorGrading';

describe('ColorGrading presets', () => {
  it('normal preset has default values', () => {
    expect(ColorGradingPresets.normal.brightness).toBe(1);
    expect(ColorGradingPresets.normal.saturation).toBe(1);
    expect(ColorGradingPresets.normal.contrast).toBe(1);
  });

  it('desaturated has low saturation', () => {
    expect(ColorGradingPresets.desaturated.saturation).toBeLessThan(1);
  });

  it('noir has zero saturation', () => {
    expect(ColorGradingPresets.noir.saturation).toBe(0);
  });

  it('warm has positive hue rotation', () => {
    expect(ColorGradingPresets.warm.hueRotate).toBeGreaterThan(0);
  });

  it('cold has negative hue rotation', () => {
    expect(ColorGradingPresets.cold.hueRotate).toBeLessThan(0);
  });

  it('toxic has large hue rotation', () => {
    expect(ColorGradingPresets.toxic.hueRotate).toBeGreaterThan(50);
  });

  it('all presets have names', () => {
    for (const preset of Object.values(ColorGradingPresets)) {
      expect(preset.name).toBeDefined();
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });
});
