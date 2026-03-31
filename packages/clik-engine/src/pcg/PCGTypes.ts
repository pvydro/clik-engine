import type { Grid2D } from '../utils/structures';
import type { Vec2 } from '../utils/vector';
import type { SeededRandom } from '../utils/random';

/** Tile types for procedurally generated levels */
export enum TileType {
  EMPTY,
  FLOOR,
  WALL,
  DOOR,
  SPAWN,
  EXIT,
  HAZARD,
  PLATFORM,
  DECORATION,
}

/** Configuration for level generation */
export interface PCGConfig {
  seed?: number;
  width: number;
  height: number;
  /** Difficulty 1-10, default 5 */
  difficulty?: number;
  /** Generator-specific theme string */
  theme?: string;
  /** Generator-specific parameter overrides */
  params?: Record<string, unknown>;
}

/** A placed entity in a generated level */
export interface EntityPlacement {
  type: string;
  x: number;
  y: number;
  properties?: Record<string, unknown>;
}

/** Metadata about a generated level */
export interface LevelMetadata {
  seed: number;
  generator: string;
  difficulty: number;
  roomCount?: number;
  pathLength?: number;
  generationTimeMs: number;
}

/** The output of a level generator */
export interface GeneratedLevel {
  grid: Grid2D<TileType>;
  entities: EntityPlacement[];
  spawn: Vec2;
  exit: Vec2;
  metadata: LevelMetadata;
}

/** Result of a constraint check */
export interface ConstraintResult {
  passed: boolean;
  message: string;
  details?: unknown;
}

/** A constraint that validates a generated level */
export interface LevelConstraint {
  name: string;
  validate(level: GeneratedLevel, config: PCGConfig): ConstraintResult;
  /** Optional auto-fix when validation fails */
  repair?(level: GeneratedLevel, config: PCGConfig): GeneratedLevel;
}

/** A strategy for generating levels */
export interface LevelGenerator {
  name: string;
  generate(config: PCGConfig, random: SeededRandom): GeneratedLevel;
}
