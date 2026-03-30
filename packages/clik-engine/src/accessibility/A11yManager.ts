import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { validateEnum, validatePositiveNumber } from '../utils/validation';

export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
const VALID_CB_MODES: readonly ColorBlindMode[] = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];

export interface A11yConfig {
  colorBlindMode?: ColorBlindMode;
  highContrast?: boolean;
  reducedMotion?: boolean;
  fontScale?: number;
}

export class A11yManager {
  private config: A11yConfig;
  private game: Phaser.Game;

  constructor(game: Phaser.Game, config?: A11yConfig) {
    this.game = game;
    if (config?.colorBlindMode) validateEnum(config.colorBlindMode, VALID_CB_MODES, 'colorBlindMode', 'A11yManager');
    if (config?.fontScale !== undefined) validatePositiveNumber(config.fontScale, 'fontScale', 'A11yManager');
    this.config = {
      colorBlindMode: 'none',
      highContrast: false,
      reducedMotion: this.detectReducedMotion(),
      fontScale: 1,
      ...config,
    };

    ConsoleReporter.engine('A11y initialized', this.config);
  }

  setColorBlindMode(mode: ColorBlindMode): void {
    this.config.colorBlindMode = mode;
    ConsoleReporter.engine(`A11y: color blind mode = ${mode}`);
  }

  getColorBlindMode(): ColorBlindMode {
    return this.config.colorBlindMode!;
  }

  setHighContrast(enabled: boolean): void {
    this.config.highContrast = enabled;
    ConsoleReporter.engine(`A11y: high contrast = ${enabled}`);
  }

  isHighContrast(): boolean {
    return this.config.highContrast!;
  }

  setReducedMotion(enabled: boolean): void {
    this.config.reducedMotion = enabled;
    ConsoleReporter.engine(`A11y: reduced motion = ${enabled}`);
  }

  isReducedMotion(): boolean {
    return this.config.reducedMotion!;
  }

  setFontScale(scale: number): void {
    this.config.fontScale = Phaser.Math.Clamp(scale, 0.5, 2);
    ConsoleReporter.engine(`A11y: font scale = ${this.config.fontScale}`);
  }

  getFontScale(): number {
    return this.config.fontScale!;
  }

  /** Get a scaled font size string */
  scaledFontSize(basePx: number): string {
    return `${Math.round(basePx * this.config.fontScale!)}px`;
  }

  /**
   * Transform a color for color blind simulation.
   * Returns the adjusted color as a number.
   */
  adjustColor(color: number): number {
    if (this.config.colorBlindMode === 'none') return color;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    let nr = r, ng = g, nb = b;

    switch (this.config.colorBlindMode) {
      case 'deuteranopia': // red-green (most common)
        nr = Math.round(r * 0.625 + g * 0.375);
        ng = Math.round(r * 0.7 + g * 0.3);
        nb = Math.round(b * 0.8 + g * 0.2);
        break;
      case 'protanopia': // red-green
        nr = Math.round(r * 0.567 + g * 0.433);
        ng = Math.round(r * 0.558 + g * 0.442);
        nb = Math.round(b * 0.9 + g * 0.1);
        break;
      case 'tritanopia': // blue-yellow
        nr = Math.round(r * 0.95 + g * 0.05);
        ng = Math.round(g * 0.433 + b * 0.567);
        nb = Math.round(g * 0.475 + b * 0.525);
        break;
    }

    return ((nr & 0xff) << 16) | ((ng & 0xff) << 8) | (nb & 0xff);
  }

  /** Get an animation duration respecting reduced motion preference */
  animDuration(normalMs: number): number {
    return this.config.reducedMotion ? 0 : normalMs;
  }

  private detectReducedMotion(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  getConfig(): A11yConfig {
    return { ...this.config };
  }
}
