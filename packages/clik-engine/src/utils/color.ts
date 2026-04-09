export const Color = {
  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  },

  rgbToHex(r: number, g: number, b: number): string {
    return `#${  [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  },

  rgbToNumber(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b;
  },

  numberToRgb(color: number): { r: number; g: number; b: number } {
    return {
      r: (color >> 16) & 0xff,
      g: (color >> 8) & 0xff,
      b: color & 0xff,
    };
  },

  blend(color1: number, color2: number, t: number): number {
    const c1 = Color.numberToRgb(color1);
    const c2 = Color.numberToRgb(color2);
    return Color.rgbToNumber(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t,
    );
  },

  lighten(color: number, amount: number): number {
    return Color.blend(color, 0xffffff, amount);
  },

  darken(color: number, amount: number): number {
    return Color.blend(color, 0x000000, amount);
  },

  numberToHex(color: number): string {
    return `#${  (color & 0xffffff).toString(16).padStart(6, '0')}`;
  },
};
