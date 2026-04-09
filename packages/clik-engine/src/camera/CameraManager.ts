import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface FollowConfig {
  lerpX?: number;
  lerpY?: number;
  offsetX?: number;
  offsetY?: number;
  deadzone?: { width: number; height: number };
}

export interface PredictionConfig {
  /** How far ahead to look based on velocity (multiplier, default: 0.3) */
  strength?: number;
  /** Damping to smooth prediction changes (0-1, default: 0.05) */
  damping?: number;
  /** Maximum prediction offset in pixels */
  maxOffset?: number;
}

export interface BoundsLock {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CameraManager {
  private scene: Phaser.Scene;
  private predictionConfig: PredictionConfig | null = null;
  private predictionOffset = { x: 0, y: 0 };
  private lastTargetPos = { x: 0, y: 0 };
  private boundsLock: BoundsLock | null = null;

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

  // --- Camera Prediction ---

  /** Enable velocity-based look-ahead. Call updatePrediction() each frame. */
  enablePrediction(config?: PredictionConfig): this {
    this.predictionConfig = {
      strength: config?.strength ?? 0.3,
      damping: config?.damping ?? 0.05,
      maxOffset: config?.maxOffset ?? 150,
    };
    return this;
  }

  /** Disable prediction */
  disablePrediction(): this {
    this.predictionConfig = null;
    this.predictionOffset = { x: 0, y: 0 };
    return this;
  }

  /**
   * Update prediction offset based on target velocity. Call each frame.
   * Adjusts the follow offset to lead the camera in the movement direction.
   */
  updatePrediction(targetX: number, targetY: number, delta: number): void {
    if (!this.predictionConfig) return;

    const dt = delta / 1000;
    const vx = (targetX - this.lastTargetPos.x) / (dt || 1);
    const vy = (targetY - this.lastTargetPos.y) / (dt || 1);
    this.lastTargetPos.x = targetX;
    this.lastTargetPos.y = targetY;

    const { strength, damping, maxOffset } = this.predictionConfig;
    const targetOffX = Math.max(-maxOffset!, Math.min(maxOffset!, vx * strength!));
    const targetOffY = Math.max(-maxOffset!, Math.min(maxOffset!, vy * strength!));

    this.predictionOffset.x += (targetOffX - this.predictionOffset.x) * damping!;
    this.predictionOffset.y += (targetOffY - this.predictionOffset.y) * damping!;
  }

  /** Get current prediction offset (add to camera follow offset) */
  getPredictionOffset(): { x: number; y: number } {
    return { ...this.predictionOffset };
  }

  // --- Directional Shake ---

  /** Shake the camera in a specific direction */
  shakeDirectional(dirX: number, dirY: number, duration = 200, intensity = 10): void {
    const cam = this.main;
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const nx = dirX / len;
    const ny = dirY / len;
    const startScrollX = cam.scrollX;
    const startScrollY = cam.scrollY;

    this.scene.tweens.addCounter({
      from: intensity,
      to: 0,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const v = tween.getValue() ?? 0;
        const noise = Math.sin(tween.elapsed * 0.05) * v;
        cam.setScroll(startScrollX + nx * noise, startScrollY + ny * noise);
      },
      onComplete: () => {
        cam.setScroll(startScrollX, startScrollY);
      },
    });
  }

  /** Shake from a world position (direction = position → camera center) */
  shakeFrom(worldX: number, worldY: number, duration = 200, intensity = 10): void {
    const center = this.getPosition();
    const dx = center.x - worldX;
    const dy = center.y - worldY;
    this.shakeDirectional(dx, dy, duration, intensity);
  }

  // --- Screen Boundary Framing ---

  /** Lock camera to a rectangular area (boss arena, room) */
  lockToBounds(bounds: BoundsLock): this {
    this.boundsLock = bounds;
    this.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    return this;
  }

  /** Release bounds lock and restore world bounds */
  unlockBounds(): this {
    this.boundsLock = null;
    this.main.removeBounds();
    return this;
  }

  /** Smoothly transition to a new bounds lock */
  async transitionBounds(bounds: BoundsLock, duration = 500): Promise<void> {
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await this.panTo(center.x, center.y, duration);
    this.lockToBounds(bounds);
  }

  /** Get current bounds lock */
  getBoundsLock(): BoundsLock | null {
    return this.boundsLock;
  }

  /** Clean up camera state */
  destroy(): void {
    this.stopFollow();
    this.predictionConfig = null;
    this.boundsLock = null;
  }
}
