/**
 * Resolves directional animation variants from a base name and direction vector.
 *
 * Supports 4-way and 8-way with automatic fallback:
 *   8-way → 4-way → base with flipX
 *
 * Convention: `{base}_{direction}` where direction is: n, ne, e, se, s, sw, w, nw
 *
 * Usage:
 * ```
 * const resolver = new DirectionalResolver('8-way');
 * resolver.resolve('walk', 0.7, -0.7); // → { animKey: 'walk_ne', flipX: false }
 * resolver.resolve('walk', -1, 0);     // → { animKey: 'walk_w', flipX: false }
 * ```
 */

export type DirectionMode = '4-way' | '8-way';

export interface DirectionalResult {
  /** The resolved animation key (e.g., 'walk_ne') */
  animKey: string;
  /** Whether to flip the sprite horizontally */
  flipX: boolean;
}

const DIRECTIONS_8 = ['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se'] as const;
const DIRECTIONS_4 = ['e', 'n', 'w', 's'] as const;

/** Maps 8-way directions to 4-way fallbacks */
const FALLBACK_4: Record<string, string> = {
  n: 'n', ne: 'e', e: 'e', se: 'e',
  s: 's', sw: 'w', w: 'w', nw: 'w',
};

/** Maps directions to their mirrored counterpart for flipX */
const MIRROR: Record<string, { dir: string; flip: boolean }> = {
  e: { dir: 'e', flip: false },
  ne: { dir: 'ne', flip: false },
  n: { dir: 'n', flip: false },
  nw: { dir: 'ne', flip: true },
  w: { dir: 'e', flip: true },
  sw: { dir: 'se', flip: true },
  s: { dir: 's', flip: false },
  se: { dir: 'se', flip: false },
};

export class DirectionalResolver {
  private mode: DirectionMode;
  private availableAnims: Set<string> | null = null;

  constructor(mode: DirectionMode = '8-way') {
    this.mode = mode;
  }

  /**
   * Optionally set the available animation keys so the resolver can fall back intelligently.
   * If not set, always returns the ideal key without checking existence.
   */
  setAvailable(animKeys: string[]): this {
    this.availableAnims = new Set(animKeys);
    return this;
  }

  /**
   * Resolve a directional animation from a base name and direction vector.
   * Direction vector does not need to be normalized.
   */
  resolve(baseName: string, dx: number, dy: number): DirectionalResult {
    // Default for zero vector
    if (dx === 0 && dy === 0) {
      return { animKey: baseName, flipX: false };
    }

    const dir = this.vectorToDirection(dx, dy);
    const idealKey = `${baseName}_${dir}`;

    // If we have an availability set, try fallbacks
    if (this.availableAnims) {
      // Try exact match
      if (this.availableAnims.has(idealKey)) {
        return { animKey: idealKey, flipX: false };
      }

      // Try 4-way fallback
      if (this.mode === '8-way') {
        const fallback4 = `${baseName}_${FALLBACK_4[dir]}`;
        if (this.availableAnims.has(fallback4)) {
          return { animKey: fallback4, flipX: false };
        }
      }

      // Try mirror with flipX
      const mirror = MIRROR[dir];
      if (mirror) {
        const mirrorKey = `${baseName}_${mirror.dir}`;
        if (this.availableAnims.has(mirrorKey)) {
          return { animKey: mirrorKey, flipX: mirror.flip };
        }
      }

      // Last resort: base name
      return { animKey: baseName, flipX: dx < 0 };
    }

    // No availability check — return ideal key
    return { animKey: idealKey, flipX: false };
  }

  /** Get the direction string for a vector */
  vectorToDirection(dx: number, dy: number): string {
    const angle = Math.atan2(-dy, dx); // -dy because screen Y is inverted
    const normalized = ((angle + Math.PI * 2) % (Math.PI * 2)); // 0 to 2PI

    if (this.mode === '8-way') {
      const index = Math.round(normalized / (Math.PI / 4)) % 8;
      return DIRECTIONS_8[index];
    } else {
      const index = Math.round(normalized / (Math.PI / 2)) % 4;
      return DIRECTIONS_4[index];
    }
  }

  /** Get mode */
  getMode(): DirectionMode {
    return this.mode;
  }
}
