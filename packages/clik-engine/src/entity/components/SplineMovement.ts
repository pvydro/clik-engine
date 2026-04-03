import { Component } from '../Component';
import type { PositionLike } from '../../utils/interfaces';

/**
 * Follows a Catmull-Rom spline path through control points.
 */
export class SplineMovement extends Component {
  private points: PositionLike[];
  private speed: number;
  private loop: boolean;
  private progress = 0;
  private totalLength: number;
  private onCompleteCallback?: () => void;
  private completed = false;

  constructor(config: { points: PositionLike[]; speed?: number; loop?: boolean }) {
    super();
    this.points = config.points;
    this.speed = config.speed ?? 100;
    this.loop = config.loop ?? false;
    this.totalLength = this.estimateLength();
  }

  onComplete(callback: () => void): this {
    this.onCompleteCallback = callback;
    return this;
  }

  setSpeed(speed: number): this {
    this.speed = speed;
    return this;
  }

  getProgress(): number {
    return this.progress;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  update(delta: number): void {
    if (this.completed) return;
    if (this.points.length < 2) return;

    const dt = delta / 1000;
    this.progress += (this.speed * dt) / this.totalLength;

    if (this.progress >= 1) {
      if (this.loop) {
        this.progress %= 1;
      } else {
        this.progress = 1;
        this.completed = true;
        this.onCompleteCallback?.();
      }
    }

    const pos = this.getPointOnSpline(this.progress);
    this.entity.x = pos.x;
    this.entity.y = pos.y;
  }

  reset(): void {
    this.progress = 0;
    this.completed = false;
  }

  private getPointOnSpline(t: number): PositionLike {
    const n = this.points.length;
    if (n < 2) return this.points[0] ?? { x: 0, y: 0 };

    // Map t to segment
    const segmentCount = this.loop ? n : n - 1;
    const scaledT = t * segmentCount;
    const segment = Math.min(Math.floor(scaledT), segmentCount - 1);
    const localT = scaledT - segment;

    // Get 4 control points (clamped for non-loop)
    const p0 = this.getPoint(segment - 1);
    const p1 = this.getPoint(segment);
    const p2 = this.getPoint(segment + 1);
    const p3 = this.getPoint(segment + 2);

    return {
      x: catmullRom(p0.x, p1.x, p2.x, p3.x, localT),
      y: catmullRom(p0.y, p1.y, p2.y, p3.y, localT),
    };
  }

  private getPoint(index: number): PositionLike {
    const n = this.points.length;
    if (this.loop) {
      return this.points[((index % n) + n) % n];
    }
    return this.points[Math.max(0, Math.min(index, n - 1))];
  }

  private estimateLength(): number {
    if (this.points.length < 2) return 1;
    let length = 0;
    const steps = this.points.length * 10;
    let prev = this.getPointOnSpline(0);
    for (let i = 1; i <= steps; i++) {
      const curr = this.getPointOnSpline(i / steps);
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      length += Math.sqrt(dx * dx + dy * dy);
      prev = curr;
    }
    return Math.max(length, 1);
  }
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}
