import { Component } from '../entity/Component';

export interface DestructibleConfig {
  /** Total health */
  maxHealth: number;
  /** Visual/behavioral stages as health decreases. Thresholds are ratios (0-1). */
  stages?: { threshold: number; callback: () => void }[];
  /** Called when fully destroyed */
  onDestroy?: () => void;
  /** Called on each damage */
  onDamage?: (amount: number, remaining: number) => void;
}

/**
 * Makes an entity destructible with health, damage stages, and callbacks.
 * Lighter than the full Health + Hurtbox pipeline — for environmental objects.
 *
 * Usage:
 * ```
 * entity.addComponent('destructible', new Destructible({
 *   maxHealth: 100,
 *   stages: [
 *     { threshold: 0.5, callback: () => showCracks() },
 *     { threshold: 0.25, callback: () => showHeavyDamage() },
 *   ],
 *   onDestroy: () => spawnDebris(),
 * }));
 * ```
 */
export class Destructible extends Component {
  private health: number;
  private maxHealth: number;
  private stages: { threshold: number; callback: () => void; fired: boolean }[];
  private onDestroyCallback?: () => void;
  private onDamageCallback?: (amount: number, remaining: number) => void;
  private destroyed = false;

  constructor(config: DestructibleConfig) {
    super();
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.stages = (config.stages ?? []).map(s => ({ ...s, fired: false }));
    this.onDestroyCallback = config.onDestroy;
    this.onDamageCallback = config.onDamage;
  }

  /** Apply damage. Returns actual damage dealt. */
  damage(amount: number): number {
    if (this.destroyed || amount <= 0) return 0;

    const actual = Math.min(amount, this.health);
    this.health -= actual;

    this.onDamageCallback?.(actual, this.health);

    // Check stages
    const ratio = this.health / this.maxHealth;
    for (const stage of this.stages) {
      if (!stage.fired && ratio <= stage.threshold) {
        stage.fired = true;
        stage.callback();
      }
    }

    if (this.health <= 0) {
      this.destroyed = true;
      this.onDestroyCallback?.();
    }

    return actual;
  }

  /** Repair damage */
  repair(amount: number): void {
    if (this.destroyed) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
    // Un-fire stages above current ratio
    const ratio = this.health / this.maxHealth;
    for (const stage of this.stages) {
      if (ratio > stage.threshold) stage.fired = false;
    }
  }

  get currentHealth(): number { return this.health; }
  get healthRatio(): number { return this.health / this.maxHealth; }
  get isDestroyed(): boolean { return this.destroyed; }

  reset(): void {
    this.health = this.maxHealth;
    this.destroyed = false;
    for (const stage of this.stages) stage.fired = false;
  }
}
