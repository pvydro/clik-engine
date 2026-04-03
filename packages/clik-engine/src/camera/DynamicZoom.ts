import Phaser from 'phaser';
import type { PositionLike } from '../utils/interfaces';

export interface DynamicZoomConfig {
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Padding around targets in world pixels */
  padding?: number;
  /** Smoothing speed (0-1, lower = smoother) */
  smoothing?: number;
}

export interface ZoomTarget {
  position: PositionLike;
  /** Weight for this target (higher = more influence on framing) */
  weight?: number;
}

/**
 * Automatically adjusts camera zoom to keep multiple targets in frame.
 * Useful for arena brawlers, co-op, and boss fights.
 *
 * Usage:
 * ```
 * const zoom = new DynamicZoom(scene, { minZoom: 0.5, maxZoom: 2, padding: 100 });
 * zoom.addTarget(player);
 * zoom.addTarget(boss);
 * zoom.update(); // call each frame
 * ```
 */
export class DynamicZoom {
  private scene: Phaser.Scene;
  private targets: ZoomTarget[] = [];
  private config: Required<DynamicZoomConfig>;
  private currentZoom: number;

  constructor(scene: Phaser.Scene, config?: DynamicZoomConfig) {
    this.scene = scene;
    this.config = {
      minZoom: config?.minZoom ?? 0.3,
      maxZoom: config?.maxZoom ?? 2,
      padding: config?.padding ?? 100,
      smoothing: config?.smoothing ?? 0.05,
    };
    this.currentZoom = scene.cameras.main.zoom;
  }

  /** Add a zoom target */
  addTarget(position: PositionLike, weight = 1): this {
    this.targets.push({ position, weight });
    return this;
  }

  /** Remove all targets */
  clearTargets(): this {
    this.targets.length = 0;
    return this;
  }

  /** Set targets directly */
  setTargets(targets: ZoomTarget[]): this {
    this.targets = [...targets];
    return this;
  }

  /** Update zoom and camera position to frame all targets. Call each frame. */
  update(): void {
    if (this.targets.length === 0) return;

    const cam = this.scene.cameras.main;

    // Compute weighted center and bounding box
    let totalWeight = 0;
    let cx = 0, cy = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const t of this.targets) {
      const w = t.weight ?? 1;
      cx += t.position.x * w;
      cy += t.position.y * w;
      totalWeight += w;

      minX = Math.min(minX, t.position.x);
      minY = Math.min(minY, t.position.y);
      maxX = Math.max(maxX, t.position.x);
      maxY = Math.max(maxY, t.position.y);
    }

    if (totalWeight > 0) {
      cx /= totalWeight;
      cy /= totalWeight;
    }

    // Compute required zoom to fit all targets
    const spreadX = (maxX - minX) + this.config.padding * 2;
    const spreadY = (maxY - minY) + this.config.padding * 2;

    const zoomX = cam.width / spreadX;
    const zoomY = cam.height / spreadY;
    const targetZoom = Phaser.Math.Clamp(
      Math.min(zoomX, zoomY),
      this.config.minZoom,
      this.config.maxZoom,
    );

    // Smooth interpolation
    this.currentZoom = Phaser.Math.Linear(this.currentZoom, targetZoom, this.config.smoothing);
    cam.setZoom(this.currentZoom);

    // Center camera on weighted center
    cam.centerOn(cx, cy);
  }

  /** Get the current computed zoom level */
  getZoom(): number {
    return this.currentZoom;
  }

  /** Get the weighted center of all targets */
  getCenter(): { x: number; y: number } {
    if (this.targets.length === 0) return { x: 0, y: 0 };
    let totalWeight = 0, cx = 0, cy = 0;
    for (const t of this.targets) {
      const w = t.weight ?? 1;
      cx += t.position.x * w;
      cy += t.position.y * w;
      totalWeight += w;
    }
    return totalWeight > 0 ? { x: cx / totalWeight, y: cy / totalWeight } : { x: 0, y: 0 };
  }

  get targetCount(): number {
    return this.targets.length;
  }

  destroy(): void {
    this.targets.length = 0;
  }
}
