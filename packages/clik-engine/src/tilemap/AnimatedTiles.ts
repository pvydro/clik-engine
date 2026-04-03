/**
 * Tiled animated tile support. Updates tile frames on a timer.
 *
 * Usage:
 * ```
 * const animated = new AnimatedTiles();
 * animated.register(42, [42, 43, 44, 45], 150); // tile 42 cycles through frames at 150ms each
 * // In update:
 * animated.update(delta); // returns tiles that need visual update
 * ```
 */

export interface AnimatedTileDef {
  /** Base tile index */
  baseTile: number;
  /** Frame sequence of tile indices */
  frames: number[];
  /** Duration per frame in ms */
  frameDuration: number;
}

export interface TileUpdate {
  baseTile: number;
  currentFrame: number;
}

interface AnimState {
  def: AnimatedTileDef;
  elapsed: number;
  currentIndex: number;
}

export class AnimatedTiles {
  private animations: Map<number, AnimState> = new Map();
  private paused = false;

  /** Register an animated tile */
  register(baseTile: number, frames: number[], frameDuration: number): this {
    this.animations.set(baseTile, {
      def: { baseTile, frames, frameDuration },
      elapsed: 0,
      currentIndex: 0,
    });
    return this;
  }

  /** Unregister an animated tile */
  unregister(baseTile: number): this {
    this.animations.delete(baseTile);
    return this;
  }

  /**
   * Update all animated tiles. Returns list of tiles whose frame changed.
   * Use the returned updates to call tilemap.putTileAt() or equivalent.
   */
  update(delta: number): TileUpdate[] {
    if (this.paused) return [];

    const updates: TileUpdate[] = [];

    for (const [, state] of this.animations) {
      state.elapsed += delta;

      if (state.elapsed >= state.def.frameDuration) {
        state.elapsed -= state.def.frameDuration;
        state.currentIndex = (state.currentIndex + 1) % state.def.frames.length;
        updates.push({
          baseTile: state.def.baseTile,
          currentFrame: state.def.frames[state.currentIndex],
        });
      }
    }

    return updates;
  }

  /** Get current frame index for a base tile */
  getCurrentFrame(baseTile: number): number | null {
    const state = this.animations.get(baseTile);
    if (!state) return null;
    return state.def.frames[state.currentIndex];
  }

  /** Pause all animations */
  pause(): this { this.paused = true; return this; }

  /** Resume all animations */
  resume(): this { this.paused = false; return this; }

  get isPaused(): boolean { return this.paused; }

  /** Get all registered base tile indices */
  getRegistered(): number[] {
    return Array.from(this.animations.keys());
  }

  /** Reset all animations to first frame */
  reset(): void {
    for (const state of this.animations.values()) {
      state.elapsed = 0;
      state.currentIndex = 0;
    }
  }

  /** Clear all animations */
  clear(): void {
    this.animations.clear();
  }

  get animationCount(): number {
    return this.animations.size;
  }
}
