export interface ThemeColors {
  primary: number;
  secondary: number;
  background: number;
  surface: number;
  text: string;
  textSecondary: string;
  accent: number;
  error: number;
  success: number;
}

/** Optional mapping of texture keys used by sprite-based UI components. */
export interface ThemeSprites {
  buttonPrimary?: string;
  buttonPrimaryHover?: string;
  buttonPrimaryPress?: string;
  buttonSecondary?: string;
  buttonSecondaryHover?: string;
  buttonSecondaryPress?: string;
  buttonDanger?: string;
  buttonDangerHover?: string;
  buttonDangerPress?: string;
  panel?: string;
  panelAlt?: string;
  progressTrack?: string;
  progressFill?: string;
  tooltip?: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  fontFamily: string;
  /** Display / title font family (falls back to `fontFamily`). */
  fontDisplay?: string;
  /** UI / button font family (falls back to `fontFamily`). */
  fontUI?: string;
  /** Global text stroke color for readability (e.g. `'#000000'`). */
  textStroke?: string;
  /** Global text stroke thickness (default `0` — no stroke). */
  textStrokeThickness?: number;
  fontSize: {
    small: string;
    medium: string;
    large: string;
    title: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  borderRadius: number;
  /** Texture keys for sprite-based UI components. */
  sprites?: ThemeSprites;
}

let currentTheme: Theme = DarkTheme();

export function setTheme(theme: Theme): void {
  currentTheme = theme;
}

export function getTheme(): Theme {
  return currentTheme;
}

export function DarkTheme(): Theme {
  return {
    name: 'dark',
    colors: {
      primary: 0x00ff88,
      secondary: 0x0088ff,
      background: 0x111111,
      surface: 0x222222,
      text: '#ffffff',
      textSecondary: '#888888',
      accent: 0xff8800,
      error: 0xff3333,
      success: 0x33ff33,
    },
    fontFamily: 'monospace',
    fontSize: { small: '12px', medium: '16px', large: '22px', title: '32px' },
    spacing: { small: 8, medium: 16, large: 24 },
    borderRadius: 4,
  };
}

export function LightTheme(): Theme {
  return {
    name: 'light',
    colors: {
      primary: 0x0066cc,
      secondary: 0x6633cc,
      background: 0xf0f0f0,
      surface: 0xffffff,
      text: '#111111',
      textSecondary: '#666666',
      accent: 0xff6600,
      error: 0xcc0000,
      success: 0x009900,
    },
    fontFamily: 'monospace',
    fontSize: { small: '12px', medium: '16px', large: '22px', title: '32px' },
    spacing: { small: 8, medium: 16, large: 24 },
    borderRadius: 4,
  };
}

export function RetroTheme(): Theme {
  return {
    name: 'retro',
    colors: {
      primary: 0x00ff00,
      secondary: 0xff00ff,
      background: 0x000000,
      surface: 0x111111,
      text: '#00ff00',
      textSecondary: '#008800',
      accent: 0xffff00,
      error: 0xff0000,
      success: 0x00ff00,
    },
    fontFamily: 'monospace',
    fontSize: { small: '10px', medium: '14px', large: '20px', title: '28px' },
    spacing: { small: 6, medium: 12, large: 20 },
    borderRadius: 0,
  };
}

export function NeonTheme(): Theme {
  return {
    name: 'neon',
    colors: {
      primary: 0xff00ff,
      secondary: 0x00ffff,
      background: 0x0a0a1a,
      surface: 0x1a1a2e,
      text: '#ffffff',
      textSecondary: '#aaaacc',
      accent: 0xffff00,
      error: 0xff3366,
      success: 0x33ff99,
    },
    fontFamily: 'monospace',
    fontSize: { small: '12px', medium: '16px', large: '22px', title: '32px' },
    spacing: { small: 8, medium: 16, large: 24 },
    borderRadius: 6,
  };
}
