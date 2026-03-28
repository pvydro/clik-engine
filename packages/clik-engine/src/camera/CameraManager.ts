import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface FollowConfig {
  lerpX?: number;
  lerpY?: number;
  offsetX?: number;
  offsetY?: number;
  deadzone?: { width: number; height: number };
}

export class CameraManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get main(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  follow(target: Phaser.GameObjects.GameObject, config?: FollowConfig): this {
    this.main.startFollow(
      target,
      false,
      config?.lerpX ?? 0.1,
      config?.lerpY ?? 0.1,
      config?.offsetX,
      config?.offsetY
    );
    if (config?.deadzone) {
      this.main.setDeadzone(config.deadzone.width, config.deadzone.height);
    }
    ConsoleReporter.engine('Camera following target');
    return this;
  }

  stopFollow(): this {
    this.main.stopFollow();
    return this;
  }

  setBounds(x: number, y: number, width: number, height: number): this {
    this.main.setBounds(x, y, width, height);
    return this;
  }

  zoomTo(zoom: number, duration = 500, ease = 'Sine.easeInOut'): Promise<void> {
    return new Promise(resolve => {
      this.main.zoomTo(zoom, duration, ease, false, (_cam: unknown, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  panTo(x: number, y: number, duration = 500, ease = 'Sine.easeInOut'): Promise<void> {
    return new Promise(resolve => {
      this.main.pan(x, y, duration, ease, false, (_cam: unknown, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  shake(duration = 200, intensity = 0.01): Promise<void> {
    return new Promise(resolve => {
      this.main.shake(duration, intensity, false, (_cam: unknown, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  flash(duration = 250, r = 255, g = 255, b = 255): Promise<void> {
    return new Promise(resolve => {
      this.main.flash(duration, r, g, b, false, (_cam: unknown, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  fadeIn(duration = 500): Promise<void> {
    return new Promise(resolve => {
      this.main.fadeIn(duration, 0, 0, 0, (_cam: unknown, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  fadeOut(duration = 500): Promise<void> {
    return new Promise(resolve => {
      this.main.fadeOut(duration, 0, 0, 0, (_cam: unknown, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const point = this.main.getWorldPoint(screenX, screenY);
    return { x: point.x, y: point.y };
  }

  /** Get current zoom level */
  getZoom(): number {
    return this.main.zoom;
  }

  /** Get camera scroll position (center of view) */
  getPosition(): { x: number; y: number } {
    return { x: this.main.scrollX + this.main.width / 2, y: this.main.scrollY + this.main.height / 2 };
  }
}
