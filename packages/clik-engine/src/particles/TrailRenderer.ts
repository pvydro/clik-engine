import type Phaser from 'phaser';

export interface TrailConfig {
  /** Maximum number of trail points (default: 20) */
  maxLength?: number;
  /** Trail width in pixels (default: 4) */
  width?: number;
  /** Trail color (default: 0xffffff) */
  color?: number;
  /** Alpha at the head (default: 1) */
  alphaStart?: number;
  /** Alpha at the tail (default: 0) */
  alphaEnd?: number;
  /** Minimum distance between points to record (default: 5) */
  minDistance?: number;
  /** Depth for the graphics object */
  depth?: number;
}

interface TrailPoint {
  x: number;
  y: number;
}

/**
 * Renders a trail behind a moving game object using connected line segments.
 * The trail fades from head to tail.
 */
export class TrailRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private points: TrailPoint[] = [];
  private config: Required<TrailConfig>;
  private target: { x: number; y: number } | null = null;
  private active = false;

  constructor(scene: Phaser.Scene, config?: TrailConfig) {
    this.scene = scene;
    this.config = {
      maxLength: config?.maxLength ?? 20,
      width: config?.width ?? 4,
      color: config?.color ?? 0xffffff,
      alphaStart: config?.alphaStart ?? 1,
      alphaEnd: config?.alphaEnd ?? 0,
      minDistance: config?.minDistance ?? 5,
      depth: config?.depth ?? 0,
    };

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(this.config.depth);
  }

  /** Attach trail to a target object */
  attachTo(target: { x: number; y: number }): this {
    this.target = target;
    this.active = true;
    return this;
  }

  /** Detach from target */
  detach(): this {
    this.target = null;
    this.active = false;
    return this;
  }

  /** Call each frame to update the trail */
  update(): void {
    if (!this.active || !this.target) return;

    const { x, y } = this.target;

    // Only add a new point if moved enough
    if (this.points.length === 0 || this.distanceToLast(x, y) >= this.config.minDistance) {
      this.points.push({ x, y });
      if (this.points.length > this.config.maxLength) {
        this.points.shift();
      }
    }

    this.render();
  }

  /** Clear all trail points */
  clear(): void {
    this.points.length = 0;
    this.graphics.clear();
  }

  /** Set trail color */
  setColor(color: number): this {
    this.config.color = color;
    return this;
  }

  /** Set trail width */
  setWidth(width: number): this {
    this.config.width = width;
    return this;
  }

  /** Get current point count */
  get length(): number {
    return this.points.length;
  }

  destroy(): void {
    this.active = false;
    this.target = null;
    this.points.length = 0;
    this.graphics.destroy();
  }

  private render(): void {
    this.graphics.clear();
    if (this.points.length < 2) return;

    for (let i = 1; i < this.points.length; i++) {
      const t = i / (this.points.length - 1); // 0 (tail) → 1 (head)
      const alpha = this.config.alphaEnd + (this.config.alphaStart - this.config.alphaEnd) * t;
      const width = this.config.width * t;

      this.graphics.lineStyle(Math.max(1, width), this.config.color, alpha);
      this.graphics.lineBetween(
        this.points[i - 1].x, this.points[i - 1].y,
        this.points[i].x, this.points[i].y
      );
    }
  }

  private distanceToLast(x: number, y: number): number {
    const last = this.points[this.points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
