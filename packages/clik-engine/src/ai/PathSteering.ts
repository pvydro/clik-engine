import type { Vec2 } from './SteeringBehaviors';
import { Steering } from './SteeringBehaviors';
import type { Grid2D } from '../utils/structures';
import type { PathNode } from '../utils/pathfinding';
import { findPath } from '../utils/pathfinding';

export interface PathSteeringConfig {
  /** Max steering speed */
  maxSpeed?: number;
  /** Arrival slow radius for final waypoint */
  arriveRadius?: number;
  /** Distance threshold to advance to next waypoint */
  waypointRadius?: number;
  /** How often to re-path in ms (0 = never auto-repath) */
  repathInterval?: number;
  /** Allow diagonal movement in pathfinding */
  diagonal?: boolean;
}

/**
 * Combines A* pathfinding with steering behaviors for smooth path following.
 * Uses seek for intermediate waypoints and arrive for the final waypoint.
 *
 * Usage:
 * ```
 * const ps = new PathSteering(grid, isWalkable, { maxSpeed: 200 });
 * ps.setPath(entity, target);
 * // Each frame:
 * const force = ps.calculate(entity, delta);
 * entity.x += force.x * dt; entity.y += force.y * dt;
 * ```
 */
export class PathSteering<T = number> {
  private grid: Grid2D<T>;
  private isWalkable: (value: T, x: number, y: number) => boolean;
  private config: Required<PathSteeringConfig>;
  private path: PathNode[] = [];
  private currentWaypoint = 0;
  private repathTimer = 0;
  private targetPos: PathNode | null = null;

  constructor(grid: Grid2D<T>, isWalkable: (value: T, x: number, y: number) => boolean, config?: PathSteeringConfig) {
    this.grid = grid;
    this.isWalkable = isWalkable;
    this.config = {
      maxSpeed: config?.maxSpeed ?? 200,
      arriveRadius: config?.arriveRadius ?? 50,
      waypointRadius: config?.waypointRadius ?? 16,
      repathInterval: config?.repathInterval ?? 0,
      diagonal: config?.diagonal ?? true,
    };
  }

  /** Compute a path from entity position to target */
  setPath(from: Vec2, to: Vec2): boolean {
    const start = { x: Math.round(from.x), y: Math.round(from.y) };
    const goal = { x: Math.round(to.x), y: Math.round(to.y) };
    this.targetPos = goal;

    this.path = findPath(this.grid, this.isWalkable, start, goal, this.config.diagonal);
    this.currentWaypoint = 0;
    return this.path.length > 0;
  }

  /** Calculate steering force for this frame */
  calculate(position: Vec2, delta: number): Vec2 {
    if (this.path.length === 0) return { x: 0, y: 0 };

    // Auto-repath
    if (this.config.repathInterval > 0 && this.targetPos) {
      this.repathTimer += delta;
      if (this.repathTimer >= this.config.repathInterval) {
        this.repathTimer = 0;
        this.setPath(position, this.targetPos);
      }
    }

    // Advance waypoint if close enough
    while (this.currentWaypoint < this.path.length - 1) {
      const wp = this.path[this.currentWaypoint];
      const dx = wp.x - position.x;
      const dy = wp.y - position.y;
      if (dx * dx + dy * dy <= this.config.waypointRadius * this.config.waypointRadius) {
        this.currentWaypoint++;
      } else {
        break;
      }
    }

    if (this.currentWaypoint >= this.path.length) return { x: 0, y: 0 };

    const wp = this.path[this.currentWaypoint];
    const isLast = this.currentWaypoint === this.path.length - 1;

    const zeroVel = { x: 0, y: 0 };
    if (isLast) {
      return Steering.arrive(position, wp, zeroVel, this.config.maxSpeed, this.config.arriveRadius);
    }
    return Steering.seek(position, wp, zeroVel, this.config.maxSpeed);
  }

  /** Check if the path is complete (entity reached the end) */
  isComplete(): boolean {
    return this.path.length === 0 || this.currentWaypoint >= this.path.length;
  }

  /** Get the current path */
  getPath(): readonly PathNode[] {
    return this.path;
  }

  /** Get the current waypoint index */
  getCurrentWaypointIndex(): number {
    return this.currentWaypoint;
  }

  /** Clear the current path */
  clearPath(): void {
    this.path = [];
    this.currentWaypoint = 0;
    this.targetPos = null;
  }

  /** Check if a path exists */
  hasPath(): boolean {
    return this.path.length > 0;
  }
}
