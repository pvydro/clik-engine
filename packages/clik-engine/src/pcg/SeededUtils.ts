import type { SeededRandom } from '../utils/random';
import type { Vec2 } from '../utils/vector';

/** Shuffle an array using seeded randomness (Fisher-Yates) */
export function shuffleArray<T>(arr: T[], random: SeededRandom): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pick from weighted items using seeded randomness */
export function weightedPick<T>(items: T[], weights: number[], random: SeededRandom): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = random.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Random point within a rectangle using seeded randomness */
export function randomPointInRect(
  x: number, y: number, w: number, h: number, random: SeededRandom,
): Vec2 {
  return {
    x: Math.floor(random.next() * w) + x,
    y: Math.floor(random.next() * h) + y,
  };
}

/** Simple 1D value noise for heightmap generation */
export function noiseSample1D(x: number, frequency: number, random: SeededRandom): number {
  const scaled = x * frequency;
  const i = Math.floor(scaled);
  const frac = scaled - i;

  // Generate deterministic values at integer points using seed offset
  const stash = random.next();
  void stash;
  const a = seededValue(i, random);
  const b = seededValue(i + 1, random);

  // Smoothstep interpolation
  const t = frac * frac * (3 - 2 * frac);
  return a + (b - a) * t;
}

function seededValue(index: number, random: SeededRandom): number {
  // Use index to generate a deterministic-ish value
  // We consume `index` calls to advance the RNG state predictably
  let val = 0;
  for (let i = 0; i <= Math.abs(index) % 10; i++) {
    val = random.next();
  }
  return val;
}
