import { findPath } from '../../utils/pathfinding';
import { TileType } from '../PCGTypes';
import type { LevelConstraint, GeneratedLevel, PCGConfig, ConstraintResult } from '../PCGTypes';

const WALKABLE_TILES = new Set([TileType.FLOOR, TileType.DOOR, TileType.SPAWN, TileType.EXIT, TileType.PLATFORM, TileType.HAZARD]);

/**
 * Validates that a path exists from spawn to exit.
 * Repair: flood-fills from spawn and carves a corridor toward the exit.
 */
export class ReachabilityConstraint implements LevelConstraint {
  readonly name = 'reachability';

  validate(level: GeneratedLevel, _config: PCGConfig): ConstraintResult {
    const path = findPath(
      level.grid,
      (tile) => WALKABLE_TILES.has(tile),
      level.spawn,
      level.exit,
    );

    if (path.length > 0) {
      return { passed: true, message: `Path exists (${path.length} steps)` };
    }

    return { passed: false, message: 'No path from spawn to exit' };
  }

  repair(level: GeneratedLevel, _config: PCGConfig): GeneratedLevel {
    const grid = level.grid;
    const { spawn, exit } = level;

    // Flood-fill from spawn to find reachable area
    const visited = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x: spawn.x, y: spawn.y }];
    visited.add(`${spawn.x},${spawn.y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = grid.getNeighbors(current.x, current.y);
      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key) && WALKABLE_TILES.has(n.value)) {
          visited.add(key);
          queue.push({ x: n.x, y: n.y });
        }
      }
    }

    // If exit is reachable, we're done
    if (visited.has(`${exit.x},${exit.y}`)) return level;

    // Carve a straight-ish corridor from nearest reachable cell to exit
    let nearest = { x: spawn.x, y: spawn.y };
    let minDist = Infinity;
    for (const key of visited) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - exit.x) + Math.abs(y - exit.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = { x, y };
      }
    }

    // Carve L-shaped corridor from nearest to exit
    let x = nearest.x;
    let y = nearest.y;
    while (x !== exit.x) {
      grid.set(x, y, TileType.FLOOR);
      x += Math.sign(exit.x - x);
    }
    while (y !== exit.y) {
      grid.set(x, y, TileType.FLOOR);
      y += Math.sign(exit.y - y);
    }
    grid.set(exit.x, exit.y, TileType.EXIT);

    return level;
  }
}
