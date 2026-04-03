import { Component } from '../Component';
import { ConsoleReporter } from '../../debug/ConsoleReporter';
import type { DamageEvent, DamageType } from '../combat/DamageTypes';

export class Health extends Component {
  current: number;
  max: number;
  shield = 0;
  maxShield = 0;
  private damageModifiers: Map<string, number> = new Map();
  private onDeathCallback?: () => void;
  private onDamageCallback?: (amount: number, remaining: number) => void;

  constructor(max: number) {
    super();
    this.max = max;
    this.current = max;
  }

  onDeath(callback: () => void): this {
    this.onDeathCallback = callback;
    return this;
  }

  onDamage(callback: (amount: number, remaining: number) => void): this {
    this.onDamageCallback = callback;
    return this;
  }

  damage(amount: number): void {
    if (this.current <= 0) return;
    this.current = Math.max(0, this.current - amount);
    ConsoleReporter.state(`${this.entity.entityType}.health: ${this.current}/${this.max}`);
    this.onDamageCallback?.(amount, this.current);
    if (this.current <= 0) {
      this.onDeathCallback?.();
    }
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  get ratio(): number {
    return this.current / this.max;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  /** Process a structured damage event with type modifiers and shield absorption */
  takeDamage(event: DamageEvent): { actualDamage: number; blocked: boolean } {
    if (this.current <= 0) return { actualDamage: 0, blocked: true };

    let amount = event.amount;

    // Apply damage type modifier
    const modifier = this.damageModifiers.get(event.type);
    if (modifier !== undefined) {
      amount *= modifier;
    }

    // Absorb with shield first
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }

    if (amount <= 0) return { actualDamage: 0, blocked: true };

    this.current = Math.max(0, this.current - amount);
    ConsoleReporter.state(`${this.entity.entityType}.health: ${this.current}/${this.max}`);
    this.onDamageCallback?.(amount, this.current);

    if (this.current <= 0) {
      this.onDeathCallback?.();
    }

    return { actualDamage: amount, blocked: false };
  }

  /** Set a damage type multiplier (e.g., 0.5 = half damage, 2.0 = double) */
  setModifier(type: DamageType, multiplier: number): this {
    this.damageModifiers.set(type, multiplier);
    return this;
  }

  /** Add shield that absorbs damage before health */
  addShield(amount: number, max?: number): this {
    if (max !== undefined) this.maxShield = max;
    this.shield = Math.min(this.shield + amount, this.maxShield || Infinity);
    return this;
  }

  reset(): void {
    this.current = this.max;
    this.shield = 0;
  }
}
