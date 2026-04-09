import type { Grid2D} from './structures';
import { PriorityQueue } from './structures';

export interface PathNode {
  x: number;
  y: number;
}

/**
 * A* pathfinding on a Grid2D. Returns a path from start to goal,
 * or empty array if no path exists.
 *
 * @param grid The grid to pathfind on
 * @param isWalkable Function that returns true if a cell is walkable
 * @param start Start position
 * @param goal Goal position
 * @param diagonal Allow diagonal movement
 */
export function findPath<T>(
  grid: Grid2D<T>,
  isWalkable: (value: T, x: number, y: number) => boolean,
  start: PathNode,
  goal: PathNode,
  diagonal = false,
): PathNode[] {
  if (!grid.inBounds(start.x, start.y) || !grid.inBounds(goal.x, goal.y)) return [];

  const goalVal = grid.get(goal.x, goal.y);
  if (goalVal !== undefined && !isWalkable(goalVal, goal.x, goal.y)) return [];

  const key = (x: number, y: number) => `${x},${y}`;
  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  const open = new PriorityQueue<PathNode>();

  gScore.set(key(start.x, start.y), 0);
  open.enqueue(start, heuristic(start, goal));

  const dirs = [
    { dx: 0, dy: -1, cost: 1 },
    { dx: 1, dy: 0, cost: 1 },
    { dx: 0, dy: 1, cost: 1 },
    { dx: -1, dy: 0, cost: 1 },
  ];
  if (diagonal) {
    const d = Math.SQRT2;
    dirs.push(
      { dx: -1, dy: -1, cost: d },
      { dx: 1, dy: -1, cost: d },
      { dx: -1, dy: 1, cost: d },
      { dx: 1, dy: 1, cost: d },
    );
  }

  while (!open.isEmpty) {
    const current = open.dequeue()!;
    const ck = key(current.x, current.y);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, ck, key);
    }

    const currentG = gScore.get(ck) ?? Infinity;

    for (const dir of dirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (!grid.inBounds(nx, ny)) continue;

      const val = grid.get(nx, ny)!;
      if (!isWalkable(val, nx, ny)) continue;

      const nk = key(nx, ny);
      const tentativeG = currentG + dir.cost;

      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentativeG);
        cameFrom.set(nk, ck);
        const f = tentativeG + heuristic({ x: nx, y: ny }, goal);
        open.enqueue({ x: nx, y: ny }, f);
      }
    }
  }

  return []; // No path found
}

function heuristic(a: PathNode, b: PathNode): number {
  // Octile distance
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

function reconstructPath(
  cameFrom: Map<string, string>,
  goalKey: string,
  keyFn: (x: number, y: number) => string,
): PathNode[] {
  const path: PathNode[] = [];
  let current = goalKey;

  while (cameFrom.has(current)) {
    const [x, y] = current.split(',').map(Number);
    path.unshift({ x, y });
    current = cameFrom.get(current)!;
  }

  // Add start
  const [sx, sy] = current.split(',').map(Number);
  path.unshift({ x: sx, y: sy });

  return path;
}
