import type Phaser from 'phaser';
import { SeededRandom } from '../utils/random';

/**
 * Per-instance seedable RNG, stored on the Phaser game registry so any scene
 * can opt into determinism by reading it.
 *
 * Usage from a scene:
 *
 *   import { getRandom } from 'clik-engine';
 *   const rng = getRandom(this);
 *   const dmg = rng?.nextInt(5, 10) ?? randomInt(5, 10);
 *
 * Falls back to `null` (and the caller to bare Math.random) when not running
 * under the harness, so production gameplay is unaffected.
 */
export const HARNESS_RANDOM_KEY = '__clikHarnessRandom';
export const HARNESS_SEED_KEY = '__clikHarnessSeed';

/**
 * Install a seeded RNG on a game's registry. Called by {@link HeadlessRunner}
 * at boot; rarely needs calling by hand.
 *
 * @category Harness
 */
export function installRandom(game: Phaser.Game, seed: number): SeededRandom {
  const rng = new SeededRandom(seed);
  game.registry.set(HARNESS_RANDOM_KEY, rng);
  game.registry.set(HARNESS_SEED_KEY, seed);
  return rng;
}

interface SceneLike {
  game?: Phaser.Game;
  registry?: { get(key: string): unknown };
}

/**
 * Read the per-instance harness RNG from inside a scene. Returns `null` when
 * the scene is not running under the test harness, so scenes can fall back
 * to `Math.random()` in production without runtime checks.
 *
 * @example
 * ```ts
 * import { BaseScene, getRandom } from 'clik-engine';
 *
 * class DungeonScene extends BaseScene {
 *   create() {
 *     super.create();
 *     const rng = getRandom(this);
 *     const rooms = rng ? rng.nextInt(4, 12) : randomInt(4, 12);
 *   }
 * }
 * ```
 *
 * @category Harness
 */
export function getRandom(scene: SceneLike): SeededRandom | null {
  const reg = scene.registry ?? scene.game?.registry;
  if (!reg) return null;
  const rng = reg.get(HARNESS_RANDOM_KEY);
  return rng instanceof SeededRandom ? rng : null;
}

/**
 * Read the seed used to construct the current harness RNG, if any. Handy
 * for logging a run ID or tagging save data with its source seed.
 *
 * @category Harness
 */
export function getSeed(scene: SceneLike): number | null {
  const reg = scene.registry ?? scene.game?.registry;
  if (!reg) return null;
  const v = reg.get(HARNESS_SEED_KEY);
  return typeof v === 'number' ? v : null;
}
