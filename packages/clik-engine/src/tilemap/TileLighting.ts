import { Grid2D } from '../utils/structures';

export interface LightSource {
  x: number;
  y: number;
  /** Light radius in tiles */
  radius: number;
  /** Light intensity (0-1) */
  intensity?: number;
}

/**
 * Tile-based flood-fill lighting system.
 * Computes a light map grid that can be used as alpha overlay.
 *
 * Usage:
 * ```
 * const lighting = new TileLighting(mapWidth, mapHeight);
 * lighting.setAmbient(0.1); // base darkness
 * lighting.addLight({ x: 5, y: 5, radius: 8, intensity: 1 });
 * lighting.compute();
 * const brightness = lighting.get(3, 3); // 0-1
 * ```
 */
export class TileLighting {
  private width: number;
  private height: number;
  private lightMap: Grid2D<number>;
  private lights: LightSource[] = [];
  private ambient = 0;
  private opaque: Set<string> = new Set();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.lightMap = new Grid2D(width, height, 0);
  }

  /** Set ambient light level (0 = total darkness, 1 = fully lit) */
  setAmbient(level: number): this {
    this.ambient = Math.max(0, Math.min(1, level));
    return this;
  }

  /** Mark a tile as opaque (blocks light) */
  setOpaque(x: number, y: number, opaque = true): this {
    const key = `${x},${y}`;
    if (opaque) this.opaque.add(key); else this.opaque.delete(key);
    return this;
  }

  /** Check if a tile is opaque */
  isOpaque(x: number, y: number): boolean {
    return this.opaque.has(`${x},${y}`);
  }

  /** Add a dynamic light source */
  addLight(light: LightSource): this {
    this.lights.push({ intensity: 1, ...light });
    return this;
  }

  /** Clear all lights (keeps opaque/ambient settings) */
  clearLights(): this {
    this.lights.length = 0;
    return this;
  }

  /** Set lights from a list (replaces existing) */
  setLights(lights: LightSource[]): this {
    this.lights = lights.map(l => ({ intensity: 1, ...l }));
    return this;
  }

  /** Recompute the light map. Call after adding/moving lights. */
  compute(): void {
    // Reset to ambient
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.lightMap.set(x, y, this.ambient);
      }
    }

    // Apply each light via flood-fill with distance falloff
    for (const light of this.lights) {
      const r = light.radius;
      const intensity = light.intensity ?? 1;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = light.x + dx;
          const ty = light.y + dy;
          if (!this.lightMap.inBounds(tx, ty)) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > r) continue;

          // Check line-of-sight (simplified: just check if target is opaque)
          if (this.isOpaque(tx, ty)) continue;

          const falloff = 1 - dist / r;
          const brightness = intensity * falloff * falloff;
          const current = this.lightMap.get(tx, ty) ?? 0;
          this.lightMap.set(tx, ty, Math.min(1, current + brightness));
        }
      }
    }
  }

  /** Get brightness at a tile (0 = dark, 1 = fully lit) */
  get(x: number, y: number): number {
    return this.lightMap.get(x, y) ?? 0;
  }

  /** Get the raw light map grid */
  getLightMap(): Grid2D<number> {
    return this.lightMap;
  }

  /** Get all light sources */
  getLights(): readonly LightSource[] {
    return this.lights;
  }

  get lightCount(): number {
    return this.lights.length;
  }

  /** Reset everything */
  clear(): void {
    this.lights.length = 0;
    this.opaque.clear();
    this.ambient = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.lightMap.set(x, y, 0);
      }
    }
  }
}
