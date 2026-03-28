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

  /** Set camera rotation */
  setRotation(radians: number): this {
    this.main.setRotation(radians);
    return this;
  }

  /** Reset camera to default state */
  reset(): this {
    this.main.setScroll(0, 0);
    this.main.setZoom(1);
    this.main.setRotation(0);
    this.main.setAlpha(1);
    this.stopFollow();
    return this;
  }

  /** Cinematic: move camera along a path of points */
  async followPath(points: { x: number; y: number; duration?: number; ease?: string }[]): Promise<void> {
    for (const point of points) {
      await this.panTo(point.x, point.y, point.duration ?? 1000, point.ease ?? 'Sine.easeInOut');
    }
  }

  // --- Shake Presets ---

  /** Light shake — UI feedback, minor hit */
  async shakeLight(): Promise<void> {
    await this.shake(100, 0.005);
  }

  /** Medium shake — damage taken, explosion nearby */
  async shakeMedium(): Promise<void> {
    await this.shake(200, 0.01);
  }

  /** Heavy shake — big explosion, boss attack */
  async shakeHeavy(): Promise<void> {
    await this.shake(350, 0.02);
  }

  /** Get the visible world bounds of the camera */
  getVisibleBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.main.scrollX,
      y: this.main.scrollY,
      width: this.main.width / this.main.zoom,
      height: this.main.height / this.main.zoom,
    };
  }

  /** Check if a world position is visible in the camera */
  isVisible(worldX: number, worldY: number, margin = 0): boolean {
    const bounds = this.getVisibleBounds();
    return worldX >= bounds.x - margin &&
           worldX <= bounds.x + bounds.width + margin &&
           worldY >= bounds.y - margin &&
           worldY <= bounds.y + bounds.height + margin;
  }
}
