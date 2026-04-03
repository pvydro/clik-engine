/**
 * Blend tree for parameter-driven animation selection.
 *
 * 1D blend: selects between animations based on a single parameter (e.g., speed: idle→walk→run).
 * 2D blend: selects between animations based on two parameters (e.g., moveX/moveY for 8-directional).
 */

export interface BlendEntry1D {
  /** Animation key */
  animKey: string;
  /** Parameter value at which this animation is fully active */
  threshold: number;
}

export interface BlendEntry2D {
  /** Animation key */
  animKey: string;
  /** X parameter value at which this animation is fully active */
  x: number;
  /** Y parameter value at which this animation is fully active */
  y: number;
}

export type BlendResult = { animKey: string; weight: number }[];

/**
 * 1D blend tree — blends between animations along a single axis.
 *
 * Usage:
 * ```
 * const tree = new BlendTree1D([
 *   { animKey: 'idle', threshold: 0 },
 *   { animKey: 'walk', threshold: 0.5 },
 *   { animKey: 'run', threshold: 1 },
 * ]);
 * tree.evaluate(0.3); // → [{ animKey: 'idle', weight: 0.4 }, { animKey: 'walk', weight: 0.6 }]
 * ```
 */
export class BlendTree1D {
  private entries: BlendEntry1D[];

  constructor(entries: BlendEntry1D[]) {
    this.entries = [...entries].sort((a, b) => a.threshold - b.threshold);
  }

  /** Evaluate the blend tree at a given parameter value. Returns weighted animation keys. */
  evaluate(param: number): BlendResult {
    if (this.entries.length === 0) return [];
    if (this.entries.length === 1) return [{ animKey: this.entries[0].animKey, weight: 1 }];

    // Clamp to range
    const min = this.entries[0].threshold;
    const max = this.entries[this.entries.length - 1].threshold;
    const clamped = Math.max(min, Math.min(max, param));

    // Find the two entries we're between
    for (let i = 0; i < this.entries.length - 1; i++) {
      const a = this.entries[i];
      const b = this.entries[i + 1];

      if (clamped >= a.threshold && clamped <= b.threshold) {
        const range = b.threshold - a.threshold;
        if (range === 0) return [{ animKey: a.animKey, weight: 1 }];

        const t = (clamped - a.threshold) / range;
        const result: BlendResult = [];
        if (1 - t > 0.001) result.push({ animKey: a.animKey, weight: 1 - t });
        if (t > 0.001) result.push({ animKey: b.animKey, weight: t });
        return result.length > 0 ? result : [{ animKey: a.animKey, weight: 1 }];
      }
    }

    // At or beyond the last entry
    return [{ animKey: this.entries[this.entries.length - 1].animKey, weight: 1 }];
  }

  /** Get the dominant animation (highest weight) at a parameter value */
  getDominant(param: number): string {
    const result = this.evaluate(param);
    if (result.length === 0) return '';
    return result.reduce((best, curr) => curr.weight > best.weight ? curr : best).animKey;
  }

  /** Get entries */
  getEntries(): readonly BlendEntry1D[] {
    return this.entries;
  }
}

/**
 * 2D blend tree — selects between animations based on two parameters.
 * Uses inverse-distance weighting for smooth blending.
 *
 * Usage:
 * ```
 * const tree = new BlendTree2D([
 *   { animKey: 'idle', x: 0, y: 0 },
 *   { animKey: 'walk_n', x: 0, y: -1 },
 *   { animKey: 'walk_e', x: 1, y: 0 },
 *   { animKey: 'walk_s', x: 0, y: 1 },
 *   { animKey: 'walk_w', x: -1, y: 0 },
 * ]);
 * tree.evaluate(0.5, -0.5); // → weighted blend between walk_n and walk_e
 * ```
 */
export class BlendTree2D {
  private entries: BlendEntry2D[];

  constructor(entries: BlendEntry2D[]) {
    this.entries = entries;
  }

  /** Evaluate using inverse-distance weighting */
  evaluate(paramX: number, paramY: number): BlendResult {
    if (this.entries.length === 0) return [];
    if (this.entries.length === 1) return [{ animKey: this.entries[0].animKey, weight: 1 }];

    const weights: number[] = [];
    let totalWeight = 0;
    const epsilon = 0.001;

    for (const entry of this.entries) {
      const dx = paramX - entry.x;
      const dy = paramY - entry.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < epsilon) {
        // Exactly on this entry
        return [{ animKey: entry.animKey, weight: 1 }];
      }

      // Inverse distance squared for smoother falloff
      const w = 1 / (dist * dist);
      weights.push(w);
      totalWeight += w;
    }

    const result: BlendResult = [];
    for (let i = 0; i < this.entries.length; i++) {
      const normalizedWeight = weights[i] / totalWeight;
      if (normalizedWeight > 0.01) {
        result.push({ animKey: this.entries[i].animKey, weight: normalizedWeight });
      }
    }

    return result;
  }

  /** Get the dominant animation (highest weight) */
  getDominant(paramX: number, paramY: number): string {
    const result = this.evaluate(paramX, paramY);
    if (result.length === 0) return '';
    return result.reduce((best, curr) => curr.weight > best.weight ? curr : best).animKey;
  }

  /** Get entries */
  getEntries(): readonly BlendEntry2D[] {
    return this.entries;
  }
}
