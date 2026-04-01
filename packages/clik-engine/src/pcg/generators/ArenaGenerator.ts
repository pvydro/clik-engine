import { Grid2D } from '../../utils/structures';
import type { SeededRandom } from '../../utils/random';
import { TileType } from '../PCGTypes';
import type { LevelGenerator, PCGConfig, GeneratedLevel, EntityPlacement } from '../PCGTypes';

/**
 * Symmetric arena generator.
 * Produces circular or rectangular arenas with obstacle rings.
 */
export class ArenaGenerator implements LevelGenerator {
  readonly name = 'arena';

  generate(config: PCGConfig, random: SeededRandom): GeneratedLevel {
    const { width, height } = config;
    const difficulty = config.difficulty ?? 5;
    const params = config.params ?? {};
    const shape = (params.shape as string) ?? 'rect';
    const obstacleRings = (params.obstacleRings as number) ?? Math.max(1, Math.floor(difficulty / 3));
    const symmetry = (params.symmetry as number) ?? 4;

    const grid = new Grid2D<TileType>(width, height, TileType.WALL);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    // Carve arena floor
    if (shape === 'circle') {
      const radius = Math.floor(Math.min(width, height) / 2) - 2;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= radius * radius) {
            grid.set(x, y, TileType.FLOOR);
          }
        }
      }
    } else {
      // Rectangle
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          grid.set(x, y, TileType.FLOOR);
        }
      }
    }

    // Place obstacle rings
    for (let ring = 1; ring <= obstacleRings; ring++) {
      const ringRadius = Math.floor((Math.min(width, height) / 2 - 2) * (ring / (obstacleRings + 1)));
      placeObstacleRing(grid, cx, cy, ringRadius, symmetry, random);
    }

    // Spawn at center
    const spawn = { x: cx, y: cy };
    grid.set(spawn.x, spawn.y, TileType.SPAWN);

    // Exit at edge
    const exit = { x: cx, y: 2 };
    grid.set(exit.x, exit.y, TileType.EXIT);

    // Place enemies at edges symmetrically
    const entities = placeEntities(cx, cy, width, height, difficulty, symmetry, random);

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

function placeObstacleRing(
  grid: Grid2D<TileType>, cx: number, cy: number,
  radius: number, symmetry: number, random: SeededRandom,
): void {
  const obstacleCount = random.nextInt(2, 4);
  const baseAngle = random.next() * Math.PI * 2;

  for (let i = 0; i < obstacleCount; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / obstacleCount;
    for (let s = 0; s < symmetry; s++) {
      const symAngle = angle + (s * Math.PI * 2) / symmetry;
      const ox = cx + Math.round(Math.cos(symAngle) * radius);
      const oy = cy + Math.round(Math.sin(symAngle) * radius);
      // Place a small obstacle cluster
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 1) continue; // cross shape
          const tile = grid.get(ox + dx, oy + dy);
          if (tile === TileType.FLOOR) {
            grid.set(ox + dx, oy + dy, TileType.WALL);
          }
        }
      }
    }
  }
}

function placeEntities(
  cx: number, cy: number, width: number, height: number,
  difficulty: number, symmetry: number, random: SeededRandom,
): EntityPlacement[] {
  const entities: EntityPlacement[] = [];
  const enemyCount = Math.max(symmetry, Math.round(difficulty * 2));
  const enemiesPerSlice = Math.ceil(enemyCount / symmetry);

  for (let s = 0; s < symmetry; s++) {
    const angle = (s * Math.PI * 2) / symmetry;
    const edgeRadius = Math.floor(Math.min(width, height) / 2) - 4;

    for (let e = 0; e < enemiesPerSlice; e++) {
      const dist = random.nextFloat(edgeRadius * 0.6, edgeRadius);
      const spread = random.nextFloat(-0.3, 0.3);
      const ex = cx + Math.round(Math.cos(angle + spread) * dist);
      const ey = cy + Math.round(Math.sin(angle + spread) * dist);
      if (ex === cx && ey === cy) continue;
      entities.push({ type: 'enemy', x: ex, y: ey, properties: { difficulty } });
    }
  }

  return entities;
}
