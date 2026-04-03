import type { GeneratedLevel, EntityPlacement } from '../PCGTypes';
import { TileType } from '../PCGTypes';

export interface BranchDef {
  /** Type of branch */
  type: 'treasure' | 'challenge' | 'shortcut' | 'secret';
  /** Length in tiles */
  length: number;
  /** What to place at the end */
  reward?: EntityPlacement;
}

export interface PathBrancherConfig {
  /** Chance of creating a branch at each valid point (0-1) */
  branchChance?: number;
  /** Max branches per level */
  maxBranches?: number;
  /** Branch definitions by type */
  branches?: BranchDef[];
}

/**
 * Adds optional branching paths to generated levels.
 * Creates treasure rooms, challenge corridors, shortcuts, and secrets.
 *
 * Usage:
 * ```
 * const brancher = new PathBrancher({ branchChance: 0.3, maxBranches: 4 });
 * const { modifiedGrid, newEntities } = brancher.addBranches(level);
 * ```
 */
export class PathBrancher {
  private config: Required<PathBrancherConfig>;

  constructor(config?: PathBrancherConfig) {
    this.config = {
      branchChance: config?.branchChance ?? 0.3,
      maxBranches: config?.maxBranches ?? 3,
      branches: config?.branches ?? [
        { type: 'treasure', length: 5, reward: { type: 'chest', x: 0, y: 0 } },
        { type: 'challenge', length: 8 },
        { type: 'secret', length: 4, reward: { type: 'secret_item', x: 0, y: 0 } },
      ],
    };
  }

  /**
   * Find valid branch points and carve branches into the level.
   * Returns new entity placements (rewards at branch ends).
   */
  addBranches(level: GeneratedLevel): { branchCount: number; entities: EntityPlacement[] } {
    const grid = level.grid;
    const entities: EntityPlacement[] = [];
    const branchPoints = this.findBranchPoints(level);
    let branchCount = 0;

    for (const point of branchPoints) {
      if (branchCount >= this.config.maxBranches) break;
      if (Math.random() > this.config.branchChance) continue;

      const branchDef = this.config.branches[branchCount % this.config.branches.length];
      const direction = this.findBranchDirection(grid, point.x, point.y);
      if (!direction) continue;

      // Carve the branch
      let cx = point.x, cy = point.y;
      let carved = 0;
      for (let i = 0; i < branchDef.length; i++) {
        const nx = cx + direction.dx;
        const ny = cy + direction.dy;
        if (!grid.inBounds(nx, ny)) break;
        if (grid.get(nx, ny) === TileType.FLOOR) break; // hit existing path

        grid.set(nx, ny, TileType.FLOOR);
        cx = nx;
        cy = ny;
        carved++;
      }

      if (carved > 0) {
        branchCount++;

        // Place reward at end
        if (branchDef.reward) {
          entities.push({
            ...branchDef.reward,
            x: cx,
            y: cy,
            properties: { ...branchDef.reward.properties, branchType: branchDef.type },
          });
        }
      }
    }

    return { branchCount, entities };
  }

  /** Find tiles adjacent to corridors where branches could start */
  findBranchPoints(level: GeneratedLevel): { x: number; y: number }[] {
    const grid = level.grid;
    const points: { x: number; y: number }[] = [];

    for (let y = 2; y < grid.height - 2; y++) {
      for (let x = 2; x < grid.width - 2; x++) {
        if (grid.get(x, y) !== TileType.FLOOR) continue;

        // Check if this is a corridor (exactly 2 adjacent floors in a line)
        let floorCount = 0;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
          if (grid.get(x + dx, y + dy) === TileType.FLOOR) floorCount++;
        }
        if (floorCount === 2) {
          points.push({ x, y });
        }
      }
    }

    return points;
  }

  /** Find a direction to carve a branch from a point */
  private findBranchDirection(
    grid: { get(x: number, y: number): number | undefined; inBounds(x: number, y: number): boolean },
    x: number,
    y: number,
  ): { dx: number; dy: number } | null {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const dir of dirs) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (!grid.inBounds(nx, ny)) continue;
      if (grid.get(nx, ny) === TileType.WALL) {
        // Check 2 tiles ahead to ensure room
        const nnx = nx + dir.dx;
        const nny = ny + dir.dy;
        if (grid.inBounds(nnx, nny) && grid.get(nnx, nny) === TileType.WALL) {
          return dir;
        }
      }
    }

    return null;
  }
}
