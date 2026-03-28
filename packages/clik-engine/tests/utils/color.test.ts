import { describe, it, expect } from 'vitest';
import { Color } from '../../src/utils/color';

describe('Color', () => {
  it('converts hex string to rgb', () => {
    expect(Color.hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
    expect(Color.hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('converts rgb to hex string', () => {
    expect(Color.rgbToHex(255, 136, 0)).toBe('#ff8800');
    expect(Color.rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts rgb to number', () => {
    expect(Color.rgbToNumber(255, 0, 0)).toBe(0xff0000);
    expect(Color.rgbToNumber(0, 255, 0)).toBe(0x00ff00);
    expect(Color.rgbToNumber(0, 0, 255)).toBe(0x0000ff);
  });

  it('converts number to rgb', () => {
    expect(Color.numberToRgb(0xff0000)).toEqual({ r: 255, g: 0, b: 0 });
    expect(Color.numberToRgb(0x00ff00)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('blends colors', () => {
    const result = Color.blend(0x000000, 0xffffff, 0.5);
    const { r, g, b } = Color.numberToRgb(result);
    expect(r).toBeGreaterThanOrEqual(127);
    expect(r).toBeLessThanOrEqual(128);
    expect(g).toBeGreaterThanOrEqual(127);
    expect(b).toBeGreaterThanOrEqual(127);
  });

  it('lightens a color', () => {
    const result = Color.lighten(0x000000, 1);
    expect(result).toBe(Color.rgbToNumber(255, 255, 255));
  });

  it('darkens a color', () => {
    const result = Color.darken(0xffffff, 1);
    expect(result).toBe(0);
  });
});
