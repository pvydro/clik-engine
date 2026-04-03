/**
 * Director AI: monitors player performance and adjusts difficulty dynamically.
 * Inspired by Left 4 Dead's AI Director.
 *
 * Usage:
 * ```
 * const director = new DirectorAI({ targetIntensity: 0.6 });
 * director.recordEvent('kill');
 * director.recordEvent('damage_taken');
 * director.update(delta);
 * const intensity = director.getIntensity(); // 0-1
 * const spawnRate = director.getModifier('spawnRate'); // adjusted multiplier
 * ```
 */

export interface DirectorConfig {
  /** Target intensity level (0-1, default: 0.5) */
  targetIntensity?: number;
  /** How fast intensity decays when nothing happens (per second, default: 0.1) */
  decayRate?: number;
  /** How fast the director adjusts (0-1, default: 0.02) */
  adjustmentSpeed?: number;
  /** Minimum time between intensity peaks in ms (default: 10000) */
  reliefDuration?: number;
}

export interface DirectorEvent {
  type: string;
  /** How much this event adds to intensity (default: 0.1) */
  intensity?: number;
  timestamp: number;
}

export class DirectorAI {
  private config: Required<DirectorConfig>;
  private currentIntensity = 0;
  private modifiers: Map<string, number> = new Map();
  private events: DirectorEvent[] = [];
  private elapsed = 0;
  private lastPeakTime = 0;
  private eventWeights: Map<string, number> = new Map();

  constructor(config?: DirectorConfig) {
    this.config = {
      targetIntensity: config?.targetIntensity ?? 0.5,
      decayRate: config?.decayRate ?? 0.1,
      adjustmentSpeed: config?.adjustmentSpeed ?? 0.02,
      reliefDuration: config?.reliefDuration ?? 10000,
    };

    // Default event weights
    this.eventWeights.set('kill', 0.15);
    this.eventWeights.set('damage_taken', 0.2);
    this.eventWeights.set('death', 0.5);
    this.eventWeights.set('heal', -0.1);
    this.eventWeights.set('combo', 0.1);

    // Default modifiers
    this.modifiers.set('spawnRate', 1);
    this.modifiers.set('enemyHealth', 1);
    this.modifiers.set('enemyDamage', 1);
    this.modifiers.set('enemyAggression', 1);
  }

  /** Set weight for an event type */
  setEventWeight(type: string, weight: number): this {
    this.eventWeights.set(type, weight);
    return this;
  }

  /** Record a gameplay event */
  recordEvent(type: string): void {
    const weight = this.eventWeights.get(type) ?? 0.1;
    this.currentIntensity = Math.max(0, Math.min(1, this.currentIntensity + weight));
    this.events.push({ type, intensity: weight, timestamp: this.elapsed });

    if (this.currentIntensity > 0.8) {
      this.lastPeakTime = this.elapsed;
    }

    // Trim old events
    const cutoff = this.elapsed - 30000;
    this.events = this.events.filter(e => e.timestamp > cutoff);
  }

  /** Update the director. Call each frame. */
  update(delta: number): void {
    this.elapsed += delta;
    const dt = delta / 1000;

    // Natural intensity decay
    this.currentIntensity = Math.max(0, this.currentIntensity - this.config.decayRate * dt);

    // Adjust modifiers toward target
    const diff = this.currentIntensity - this.config.targetIntensity;
    const inRelief = this.elapsed - this.lastPeakTime < this.config.reliefDuration;

    if (inRelief) {
      // During relief: reduce spawn rate, ease pressure
      this.adjustModifier('spawnRate', -this.config.adjustmentSpeed);
      this.adjustModifier('enemyAggression', -this.config.adjustmentSpeed);
    } else if (diff > 0.1) {
      // Too intense: ease off
      this.adjustModifier('spawnRate', -this.config.adjustmentSpeed);
      this.adjustModifier('enemyDamage', -this.config.adjustmentSpeed * 0.5);
    } else if (diff < -0.1) {
      // Too calm: ramp up
      this.adjustModifier('spawnRate', this.config.adjustmentSpeed);
      this.adjustModifier('enemyAggression', this.config.adjustmentSpeed);
    }
  }

  /** Get current intensity (0-1) */
  getIntensity(): number {
    return this.currentIntensity;
  }

  /** Get a difficulty modifier (multiplier around 1.0) */
  getModifier(name: string): number {
    return this.modifiers.get(name) ?? 1;
  }

  /** Get all modifiers */
  getAllModifiers(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [k, v] of this.modifiers) result[k] = v;
    return result;
  }

  /** Set target intensity */
  setTargetIntensity(target: number): this {
    this.config.targetIntensity = Math.max(0, Math.min(1, target));
    return this;
  }

  /** Get recent events count by type */
  getRecentEventCount(type: string, windowMs = 10000): number {
    const cutoff = this.elapsed - windowMs;
    return this.events.filter(e => e.type === type && e.timestamp > cutoff).length;
  }

  /** Whether the director is in a relief period */
  isInRelief(): boolean {
    return this.elapsed - this.lastPeakTime < this.config.reliefDuration;
  }

  getDebugState(): Record<string, unknown> {
    return {
      intensity: Math.round(this.currentIntensity * 100) / 100,
      inRelief: this.isInRelief(),
      modifiers: this.getAllModifiers(),
      recentEvents: this.events.length,
    };
  }

  /** Reset to initial state */
  reset(): void {
    this.currentIntensity = 0;
    this.events = [];
    this.elapsed = 0;
    this.lastPeakTime = 0;
    for (const key of this.modifiers.keys()) {
      this.modifiers.set(key, 1);
    }
  }

  private adjustModifier(name: string, amount: number): void {
    const current = this.modifiers.get(name) ?? 1;
    this.modifiers.set(name, Math.max(0.3, Math.min(2, current + amount)));
  }
}
