import Phaser from 'phaser';
import type { PositionLike } from '../utils/interfaces';

export interface RaycastHit {
  object: Phaser.GameObjects.GameObject;
  x: number;
  y: number;
  distance: number;
}

export const Raycast = {
  /**
   * Cast a ray from origin in a direction, checking against a list of objects.
   * Returns the closest hit, or null if no intersection.
   */
  cast(
    scene: Phaser.Scene,
    originX: number,
    originY: number,
    dirX: number,
    dirY: number,
    maxDistance: number,
    objects: Phaser.GameObjects.GameObject[],
  ): RaycastHit | null {
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len === 0) return null;
    const nx = dirX / len;
    const ny = dirY / len;

    let closest: RaycastHit | null = null;

    for (const obj of objects) {
      const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;

      const hit = Raycast.rayVsRect(
        originX, originY, nx, ny, maxDistance,
        body.x, body.y, body.width, body.height,
      );

      if (hit && (!closest || hit.distance < closest.distance)) {
        closest = { object: obj, x: hit.x, y: hit.y, distance: hit.distance };
      }
    }

    return closest;
  },

  /**
   * Check if there's line-of-sight between two points (no objects blocking).
   */
  lineOfSight(
    scene: Phaser.Scene,
    x1: number, y1: number,
    x2: number, y2: number,
    obstacles: Phaser.GameObjects.GameObject[],
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hit = Raycast.cast(scene, x1, y1, dx, dy, dist, obstacles);
    return hit === null;
  },

  /**
   * Find all objects within a circular area.
   */
  queryCircle(
    objects: Phaser.GameObjects.GameObject[],
    cx: number, cy: number,
    radius: number,
  ): Phaser.GameObjects.GameObject[] {
    const r2 = radius * radius;
    return objects.filter(obj => {
      const go = obj as unknown as PositionLike;
      if (go.x === undefined) return false;
      const dx = go.x - cx;
      const dy = go.y - cy;
      return dx * dx + dy * dy <= r2;
    });
  },

  /**
   * Find all objects within a rectangular area.
   */
  queryRect(
    objects: Phaser.GameObjects.GameObject[],
    x: number, y: number,
    width: number, height: number,
  ): Phaser.GameObjects.GameObject[] {
    return objects.filter(obj => {
      const go = obj as unknown as PositionLike;
      if (go.x === undefined) return false;
      return go.x >= x && go.x <= x + width && go.y >= y && go.y <= y + height;
    });
  },

  /**
   * Find the nearest object to a point.
   */
  nearest(
    objects: Phaser.GameObjects.GameObject[],
    x: number, y: number,
  ): Phaser.GameObjects.GameObject | null {
    let closest: Phaser.GameObjects.GameObject | null = null;
    let closestDist = Infinity;

    for (const obj of objects) {
      const go = obj as unknown as PositionLike;
      if (go.x === undefined) continue;
      const dx = go.x - x;
      const dy = go.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = obj;
      }
    }

    return closest;
  },

  /** Ray vs AABB intersection test */
  rayVsRect(
    ox: number, oy: number,
    dx: number, dy: number,
    maxDist: number,
    rx: number, ry: number,
    rw: number, rh: number,
  ): { x: number; y: number; distance: number } | null {
    let tmin = 0;
    let tmax = maxDist;

    if (dx !== 0) {
      const t1 = (rx - ox) / dx;
      const t2 = (rx + rw - ox) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (ox < rx || ox > rx + rw) {
      return null;
    }

    if (dy !== 0) {
      const t1 = (ry - oy) / dy;
      const t2 = (ry + rh - oy) / dy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (oy < ry || oy > ry + rh) {
      return null;
    }

    if (tmax < tmin) return null;

    return { x: ox + dx * tmin, y: oy + dy * tmin, distance: tmin };
  },

  /**
   * Debug visualization: draw a ray in the scene.
   */
  debugDraw(
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    color = 0xff0000,
    hit?: RaycastHit | null,
  ): void {
    graphics.lineStyle(1, color, 0.6);
    graphics.lineBetween(x1, y1, x2, y2);
    if (hit) {
      graphics.fillStyle(0xffff00, 1);
      graphics.fillCircle(hit.x, hit.y, 4);
    }
  },
};
