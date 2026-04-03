import type { PositionLike } from '../../utils/interfaces';
import { EntityFactory } from '../EntityFactory';
import { EntityRegistry } from '../EntityRegistry';
import { Entity } from '../Entity';

export interface SpawnDef {
  prefab: string;
  count: number;
  spawnPositions?: PositionLike[];
  spawnArea?: { x: number; y: number; width: number; height: number };
  delay?: number;
  interval?: number;
}

export interface WaveDef {
  spawns: SpawnDef[];
  delayBefore?: number;
  delayAfter?: number;
}

type WaveCallback = (waveIndex: number) => void;
type SpawnCallback = (entity: Entity, waveIndex: number) => void;

/**
 * Sequences enemy spawns in waves.
 *
 * Usage:
 * ```
 * const waveManager = new WaveManager(factory, registry);
 * waveManager.setWaves([
 *   { spawns: [{ prefab: 'enemy', count: 5, spawnArea: { x: 0, y: 0, width: 800, height: 100 } }] },
 *   { spawns: [{ prefab: 'enemy', count: 10 }], delayBefore: 2000 },
 * ]);
 * waveManager.start();
 * // Call waveManager.update(delta) in scene update
 * ```
 */
export class WaveManager {
  private factory: EntityFactory;
  private registry: EntityRegistry;
  private waves: WaveDef[] = [];
  private waveIndex = 0;
  private paused = false;
  private started = false;
  private complete = false;
  private waveTimer = 0;
  private spawnState: SpawnState[] = [];
  private spawnedEntities: Set<Entity> = new Set();

  private waveStartCallbacks: WaveCallback[] = [];
  private waveCompleteCallbacks: WaveCallback[] = [];
  private allCompleteCallbacks: (() => void)[] = [];
  private spawnCallbacks: SpawnCallback[] = [];

  private phase: 'delayBefore' | 'spawning' | 'waitClear' | 'delayAfter' = 'delayBefore';

  constructor(factory: EntityFactory, registry: EntityRegistry) {
    this.factory = factory;
    this.registry = registry;
  }

  setWaves(waves: WaveDef[]): this {
    this.waves = waves;
    return this;
  }

  start(): this {
    this.started = true;
    this.complete = false;
    this.waveIndex = 0;
    this.beginWave();
    return this;
  }

  nextWave(): this {
    this.waveIndex++;
    if (this.waveIndex >= this.waves.length) {
      this.complete = true;
      for (const cb of this.allCompleteCallbacks) cb();
    } else {
      this.beginWave();
    }
    return this;
  }

  pause(): this {
    this.paused = true;
    return this;
  }

  resume(): this {
    this.paused = false;
    return this;
  }

  update(delta: number): void {
    if (!this.started || this.paused || this.complete) return;

    // Prune destroyed entities
    for (const entity of this.spawnedEntities) {
      if (!entity.active) this.spawnedEntities.delete(entity);
    }

    this.waveTimer += delta;
    const wave = this.waves[this.waveIndex];
    if (!wave) return;

    switch (this.phase) {
      case 'delayBefore':
        if (this.waveTimer >= (wave.delayBefore ?? 0)) {
          this.waveTimer = 0;
          this.phase = 'spawning';
          for (const cb of this.waveStartCallbacks) cb(this.waveIndex);
        }
        break;

      case 'spawning':
        this.processSpawns(delta);
        if (this.allSpawnsDone()) {
          this.phase = 'waitClear';
        }
        break;

      case 'waitClear':
        if (this.spawnedEntities.size === 0) {
          this.waveTimer = 0;
          this.phase = 'delayAfter';
          for (const cb of this.waveCompleteCallbacks) cb(this.waveIndex);
        }
        break;

      case 'delayAfter':
        if (this.waveTimer >= (wave.delayAfter ?? 0)) {
          this.nextWave();
        }
        break;
    }
  }

  onWaveStart(callback: WaveCallback): this {
    this.waveStartCallbacks.push(callback);
    return this;
  }

  onWaveComplete(callback: WaveCallback): this {
    this.waveCompleteCallbacks.push(callback);
    return this;
  }

  onAllComplete(callback: () => void): this {
    this.allCompleteCallbacks.push(callback);
    return this;
  }

  onSpawn(callback: SpawnCallback): this {
    this.spawnCallbacks.push(callback);
    return this;
  }

  get currentWaveIndex(): number {
    return this.waveIndex;
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  get enemiesRemaining(): number {
    return this.spawnedEntities.size;
  }

  get isComplete(): boolean {
    return this.complete;
  }

  get isStarted(): boolean {
    return this.started;
  }

  private beginWave(): void {
    this.waveTimer = 0;
    this.phase = 'delayBefore';
    const wave = this.waves[this.waveIndex];
    if (!wave) return;

    this.spawnState = wave.spawns.map(def => ({
      def,
      spawned: 0,
      timer: def.delay ?? 0,
      intervalTimer: 0,
      done: false,
    }));
  }

  private processSpawns(_delta: number): void {
    for (const state of this.spawnState) {
      if (state.done) continue;

      state.timer -= _delta;
      if (state.timer > 0) continue;

      state.intervalTimer -= _delta;
      if (state.intervalTimer <= 0) {
        this.spawnOne(state);
        state.spawned++;
        state.intervalTimer = state.def.interval ?? 0;

        if (state.spawned >= state.def.count) {
          state.done = true;
        }
      }
    }
  }

  private spawnOne(state: SpawnState): void {
    const { def } = state;
    let x = 0;
    let y = 0;

    if (def.spawnPositions && def.spawnPositions.length > 0) {
      const idx = state.spawned % def.spawnPositions.length;
      x = def.spawnPositions[idx].x;
      y = def.spawnPositions[idx].y;
    } else if (def.spawnArea) {
      x = def.spawnArea.x + Math.random() * def.spawnArea.width;
      y = def.spawnArea.y + Math.random() * def.spawnArea.height;
    }

    const entity = this.factory.create(def.prefab, this.getScene(), x, y);
    if (entity) {
      this.spawnedEntities.add(entity);
      for (const cb of this.spawnCallbacks) cb(entity, this.waveIndex);
    }
  }

  private allSpawnsDone(): boolean {
    return this.spawnState.every(s => s.done);
  }

  private getScene(): Phaser.Scene {
    // Get scene from any registered entity, or from the first wave entity
    const anyEntity = this.registry.getAll()[0];
    return anyEntity?.scene as Phaser.Scene;
  }
}

interface SpawnState {
  def: SpawnDef;
  spawned: number;
  timer: number;
  intervalTimer: number;
  done: boolean;
}
