import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export class PlatformManager {
  private game: Phaser.Game;
  private _isMobile: boolean;
  private _isCapacitor: boolean;
  private pauseCallbacks: (() => void)[] = [];
  private resumeCallbacks: (() => void)[] = [];

  constructor(game: Phaser.Game) {
    this.game = game;
    this._isMobile = !game.device.os.desktop;
    this._isCapacitor = typeof (globalThis as Record<string, unknown>).Capacitor !== 'undefined';

    // Handle app lifecycle (pause/resume)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        ConsoleReporter.engine('App paused (visibility hidden)');
        for (const cb of this.pauseCallbacks) cb();
        game.scene.getScenes(true).forEach(s => {
          if (!s.scene.key.startsWith('__clik_')) {
            s.scene.pause();
          }
        });
      } else {
        ConsoleReporter.engine('App resumed (visibility visible)');
        for (const cb of this.resumeCallbacks) cb();
        game.scene.getScenes(true).forEach(s => {
          if (!s.scene.key.startsWith('__clik_')) {
            s.scene.resume();
          }
        });
      }
    });

    // Handle Android back button
    if (this._isMobile) {
      document.addEventListener('backbutton', (e) => {
        e.preventDefault();
        ConsoleReporter.input('Back button pressed');
      });
    }

    ConsoleReporter.engine('Platform detected', {
      mobile: this._isMobile,
      capacitor: this._isCapacitor,
      os: this.getOS(),
    });
  }

  get isMobile(): boolean { return this._isMobile; }
  get isDesktop(): boolean { return !this._isMobile; }
  get isCapacitor(): boolean { return this._isCapacitor; }

  getOS(): string {
    const os = this.game.device.os;
    if (os.iOS) return 'ios';
    if (os.android) return 'android';
    if (os.macOS) return 'macos';
    if (os.windows) return 'windows';
    if (os.linux) return 'linux';
    return 'unknown';
  }

  isPortrait(): boolean {
    return window.innerHeight > window.innerWidth;
  }

  isLandscape(): boolean {
    return window.innerWidth >= window.innerHeight;
  }

  getSafeArea(): SafeArea {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    };
  }

  onPause(callback: () => void): this {
    this.pauseCallbacks.push(callback);
    return this;
  }

  onResume(callback: () => void): this {
    this.resumeCallbacks.push(callback);
    return this;
  }

  async requestFullscreen(): Promise<void> {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      ConsoleReporter.error('Fullscreen request denied');
    }
  }

  exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }
}
