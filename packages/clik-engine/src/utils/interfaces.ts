/**
 * Shared interfaces to replace `as unknown as` casts across the codebase.
 * These describe the minimal shape needed by various engine systems.
 */

/** Anything with x/y position */
export interface PositionLike {
  x: number;
  y: number;
}

/** Anything with x/y and setPosition */
export interface TransformLike extends PositionLike {
  setPosition(x: number, y: number): void;
}

/** Anything with scale, position, and alpha — covers most tween/animation targets */
export interface TweenableLike extends PositionLike {
  scaleX: number;
  scaleY: number;
  alpha: number;
}

/** Anything with depth (for z-ordering) */
export interface DepthLike {
  depth: number;
}

/** Anything with visibility control */
export interface VisibilityLike {
  setVisible(value: boolean): void;
}

/** Anything that can be positioned in space */
export interface SpawnableLike extends VisibilityLike {
  setPosition(x: number, y: number): void;
}
