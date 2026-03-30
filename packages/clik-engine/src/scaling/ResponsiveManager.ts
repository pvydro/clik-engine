import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { BaseScene } from '../scenes/BaseScene';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface BreakpointConfig {
  xs: number; // < 480
  sm: number; // < 768
  md: number; // < 1024
  lg: number; // < 1280
  // xl = anything above lg
}

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1280,
};

export class ResponsiveManager {
  private game: Phaser.Game;
  private breakpoints: BreakpointConfig;
  private currentBreakpoint: Breakpoint = 'md';
  private breakpointListeners: ((bp: Breakpoint) => void)[] = [];
  private resizeHandler: ((gameSize: Phaser.Structs.Size) => void) | null = null;

  constructor(game: Phaser.Game, breakpoints?: Partial<BreakpointConfig>) {
    this.game = game;
    this.breakpoints = { ...DEFAULT_BREAKPOINTS, ...breakpoints };
    this.currentBreakpoint = this.calculateBreakpoint();

    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      const width = gameSize.width;
      const height = gameSize.height;

      ConsoleReporter.engine(`Resize: ${width}x${height}`);

      // Check breakpoint change
      const newBp = this.calculateBreakpoint();
      if (newBp !== this.currentBreakpoint) {
        this.currentBreakpoint = newBp;
        ConsoleReporter.engine(`Breakpoint: ${newBp}`);
        for (const listener of this.breakpointListeners) {
          listener(newBp);
        }
      }

      for (const scene of game.scene.getScenes(true)) {
        if (scene instanceof BaseScene) {
          scene.onResize(width, height);
        }
      }
    };
    game.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
  }

  private calculateBreakpoint(): Breakpoint {
    const w = this.game.scale.width;
    if (w < this.breakpoints.xs) return 'xs';
    if (w < this.breakpoints.sm) return 'sm';
    if (w < this.breakpoints.md) return 'md';
    if (w < this.breakpoints.lg) return 'lg';
    return 'xl';
  }

  getBreakpoint(): Breakpoint {
    return this.currentBreakpoint;
  }

  onBreakpointChange(listener: (bp: Breakpoint) => void): this {
    this.breakpointListeners.push(listener);
    return this;
  }

  /** Get a value based on current breakpoint */
  responsive<T>(values: Partial<Record<Breakpoint, T>> & { default: T }): T {
    return values[this.currentBreakpoint] ?? values.default;
  }

  isPortrait(): boolean {
    return this.game.scale.height > this.game.scale.width;
  }

  isLandscape(): boolean {
    return this.game.scale.width >= this.game.scale.height;
  }

  isMobile(): boolean {
    return !this.game.device.os.desktop;
  }

  isDesktop(): boolean {
    return this.game.device.os.desktop;
  }

  /** Check if current width is at least a given breakpoint */
  isAtLeast(bp: Breakpoint): boolean {
    const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    return order.indexOf(this.currentBreakpoint) >= order.indexOf(bp);
  }

  get width(): number {
    return this.game.scale.width;
  }

  get height(): number {
    return this.game.scale.height;
  }

  /** Get device pixel ratio */
  get dpr(): number {
    return window.devicePixelRatio ?? 1;
  }

  destroy(): void {
    if (this.resizeHandler) {
      this.game.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
      this.resizeHandler = null;
    }
    this.breakpointListeners.length = 0;
  }
}
