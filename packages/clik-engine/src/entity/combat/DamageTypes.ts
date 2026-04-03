import type { Entity } from '../Entity';

export type DamageType = 'physical' | 'fire' | 'ice' | 'electric' | 'poison' | (string & {});

export interface DamageEvent {
  source: Entity | null;
  target: Entity;
  amount: number;
  type: DamageType;
  knockback?: { x: number; y: number };
  isCritical?: boolean;
}

export interface DamageModifier {
  type: DamageType;
  multiplier: number;
}

export interface HitboxDef {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  damageType?: DamageType;
  damageAmount?: number;
  tag?: string;
}

export interface HurtboxDef {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  damageMultiplier?: number;
  tag?: string;
}

export interface WorldBox {
  x: number;
  y: number;
  width: number;
  height: number;
  tag?: string;
}
