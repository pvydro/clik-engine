import { Grid2D } from '../../utils/structures';
import type { SeededRandom } from '../../utils/random';
import { TileType } from '../PCGTypes';
import type { LevelGenerator, PCGConfig, GeneratedLevel, EntityPlacement } from '../PCGTypes';

/**
 * Heightmap-based platformer level generator.
 * Generates ground terrain with midpoint displacement, places floating platforms and gaps.
 */
export class PlatformerGenerator implements LevelGenerator {
  readonly name = 'platformer';

  generate(config: PCGConfig, random: SeededRandom): GeneratedLevel {
    const { width, height } = config;
    const difficulty = config.difficulty ?? 5;
    const params = config.params ?? {};
    const groundLevel = (params.groundLevel as number) ?? Math.floor(height * 0.75);
    const platformDensity = (params.platformDensity as number) ?? 0.3;
    const gapFrequency = (params.gapFrequency as number) ?? 0.15;
    const maxJumpHeight = (params.maxJumpHeight as number) ?? 4;

    const grid = new Grid2D<TileType>(width, height, TileType.EMPTY);

    // Generate ground heightmap via midpoint displacement
    const heightmap = generateHeightmap(width, groundLevel, 3, random);

    // Carve ground terrain
    for (let x = 0; x < width; x++) {
      const groundY = heightmap[x];
      // Introduce gaps
      if (x > 2 && x < width - 3 && random.next() < gapFrequency) {
        // Skip this column (gap)
        continue;
      }
      for (let y = groundY; y < height; y++) {
        grid.set(x, y, y === groundY ? TileType.FLOOR : TileType.WALL);
      }
    }

    // Place floating platforms
    const platforms: { x: number; y: number; w: number }[] = [];
    for (let x = 3; x < width - 5; x += random.nextInt(3, 6)) {
      if (random.next() > platformDensity) continue;
      const platY = random.nextInt(
        Math.max(2, heightmap[x] - maxJumpHeight - 3),
        Math.max(3, heightmap[x] - 2),
      );
      const platW = random.nextInt(3, 6);
      platforms.push({ x, y: platY, w: platW });
      for (let px = x; px < Math.min(width - 1, x + platW); px++) {
        grid.set(px, platY, TileType.PLATFORM);
      }
    }

    // Walls at edges
    for (let y = 0; y < height; y++) {
      grid.set(0, y, TileType.WALL);
      grid.set(width - 1, y, TileType.WALL);
    }

    // Spawn at left, exit at right
    const spawnX = 2;
    const spawnY = heightmap[spawnX] - 1;
    const exitX = width - 3;
    const exitY = heightmap[exitX] - 1;
    const spawn = { x: spawnX, y: spawnY };
    const exit = { x: exitX, y: exitY };
    grid.set(spawn.x, spawn.y, TileType.SPAWN);
    grid.set(exit.x, exit.y, TileType.EXIT);

    // Place entities
    const entities = placeEntities(platforms, heightmap, width, difficulty, spawn, exit, random);

    // Place hazards in gaps
    for (let x = 1; x < width - 1; x++) {
      const below = grid.get(x, height - 1);
      const above = grid.get(x, height - 2);
      if (below === TileType.EMPTY && above === TileType.EMPTY) {
        grid.set(x, height - 1, TileType.HAZARD);
      }
    }

    return {
      grid,
      entities,
      spawn,
      exit,
      metadata: {
        seed: config.seed ?? 0,
        generator: this.name,
        difficulty,
        generationTimeMs: 0,
      },
    };
  }
}

function generateHeightmap(width: number, baseLevel: number, variance: number, random: SeededRandom): number[] {
  const heights = new Array<number>(width);
  heights[0] = baseLevel;
  heights[width - 1] = baseLevel;

  // Midpoint displacement
  subdivide(heights, 0, width - 1, variance, random);

  // Clamp
  for (let i = 0; i < width; i++) {
    heights[i] = Math.max(4, Math.min(heights[i], baseLevel + 4));
    heights[i] = Math.round(heights[i]);
  }

  return heights;
}

function subdivide(
  heights: number[], left: number, right: number,
  variance: number, random: SeededRandom,
): void {
  if (right - left < 2) return;
  const mid = Math.floor((left + right) / 2);
  heights[mid] = (heights[left] + heights[right]) / 2 + random.nextFloat(-variance, variance);
  subdivide(heights, left, mid, variance * 0.6, random);
  subdivide(heights, mid, right, variance * 0.6, random);
}

function placeEntities(
  platforms: { x: number; y: number; w: number }[],
  heightmap: number[], width: number,
  difficulty: number,
  spawn: { x: number; y: number },
  exit: { x: number; y: number },
  random: SeededRandom,
): EntityPlacement[] {
  const entities: EntityPlacement[] = [];
  const enemyCount = Math.max(1, Math.round(difficulty * 1.5));
  const collectibleCount = Math.max(2, Math.round(difficulty * 1.2));

  // Enemies on platforms
  let placed = 0;
  for (const plat of platforms) {
    if (placed >= enemyCount) break;
    if (random.next() < 0.5) continue;
    const ex = random.nextInt(plat.x, plat.x + plat.w - 1);
    entities.push({ type: 'enemy', x: ex, y: plat.y - 1, properties: { difficulty } });
    placed++;
  }

  // Fill remaining enemies on ground
  for (let i = placed; i < enemyCount; i++) {
    const x = random.nextInt(4, width - 5);
    const y = heightmap[x] - 1;
    if (x === spawn.x && y === spawn.y) continue;
    if (x === exit.x && y === exit.y) continue;
    entities.push({ type: 'enemy', x, y, properties: { difficulty } });
  }

  // Collectibles above gaps and platforms
  let collectibles = 0;
  for (let x = 3; x < width - 3 && collectibles < collectibleCount; x += random.nextInt(3, 7)) {
    const y = random.nextInt(2, heightmap[x] - 3);
    entities.push({ type: 'collectible', x, y });
    collectibles++;
  }

  return entities;
}
