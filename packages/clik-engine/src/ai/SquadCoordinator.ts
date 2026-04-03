import type { Entity } from '../entity/Entity';
import type { PositionLike } from '../utils/interfaces';

export type SquadRole = 'attacker' | 'flanker' | 'supporter';

export interface SquadMember {
  entity: Entity;
  role: SquadRole;
}

export interface FormationSlot {
  offsetX: number;
  offsetY: number;
}

/**
 * Coordinates a group of AI entities with attack tokens, formations, and roles.
 *
 * Usage:
 * ```
 * const squad = new SquadCoordinator({ maxAttackers: 2 });
 * squad.addMember(enemy1, 'attacker');
 * squad.addMember(enemy2, 'flanker');
 * squad.setTarget(player);
 * // Each frame:
 * squad.update();
 * if (squad.requestAttackToken(enemy1)) { // enemy1 can attack }
 * ```
 */
export class SquadCoordinator {
  private members: Map<Entity, SquadMember> = new Map();
  private attackTokens: Set<Entity> = new Set();
  private maxAttackers: number;
  private target: PositionLike | null = null;
  private formation: FormationSlot[] = [];

  constructor(config?: { maxAttackers?: number }) {
    this.maxAttackers = config?.maxAttackers ?? 2;
  }

  /** Add a member to the squad */
  addMember(entity: Entity, role: SquadRole = 'attacker'): this {
    this.members.set(entity, { entity, role });
    return this;
  }

  /** Remove a member */
  removeMember(entity: Entity): this {
    this.members.delete(entity);
    this.attackTokens.delete(entity);
    return this;
  }

  /** Set the target all squad members focus on */
  setTarget(target: PositionLike | null): this {
    this.target = target;
    return this;
  }

  /** Request an attack token. Returns true if the entity is allowed to attack. */
  requestAttackToken(entity: Entity): boolean {
    if (this.attackTokens.has(entity)) return true;
    if (this.attackTokens.size >= this.maxAttackers) return false;
    if (!this.members.has(entity)) return false;
    this.attackTokens.add(entity);
    return true;
  }

  /** Release an attack token (call when attack animation finishes) */
  releaseAttackToken(entity: Entity): void {
    this.attackTokens.delete(entity);
  }

  /** Prune dead/inactive members. Call periodically. */
  update(): void {
    for (const [entity] of this.members) {
      if (!entity.active) {
        this.members.delete(entity);
        this.attackTokens.delete(entity);
      }
    }
  }

  /** Set a formation pattern (offsets from target position) */
  setFormation(slots: FormationSlot[]): this {
    this.formation = slots;
    return this;
  }

  /** Set a circle formation */
  setCircleFormation(radius: number): this {
    const count = this.members.size;
    this.formation = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      this.formation.push({
        offsetX: Math.cos(angle) * radius,
        offsetY: Math.sin(angle) * radius,
      });
    }
    return this;
  }

  /** Set a line formation */
  setLineFormation(spacing: number): this {
    const count = this.members.size;
    this.formation = [];
    const startX = -((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      this.formation.push({ offsetX: startX + i * spacing, offsetY: 0 });
    }
    return this;
  }

  /** Get the formation position for a member (based on their index in the squad) */
  getFormationPosition(entity: Entity): PositionLike | null {
    if (!this.target || this.formation.length === 0) return null;

    const memberList = Array.from(this.members.keys());
    const index = memberList.indexOf(entity);
    if (index < 0 || index >= this.formation.length) return null;

    const slot = this.formation[index];
    return {
      x: this.target.x + slot.offsetX,
      y: this.target.y + slot.offsetY,
    };
  }

  /** Get members by role */
  getMembersByRole(role: SquadRole): Entity[] {
    const result: Entity[] = [];
    for (const [entity, member] of this.members) {
      if (member.role === role) result.push(entity);
    }
    return result;
  }

  /** Get all active members */
  getMembers(): Entity[] {
    return Array.from(this.members.keys());
  }

  /** Change a member's role */
  setRole(entity: Entity, role: SquadRole): void {
    const member = this.members.get(entity);
    if (member) member.role = role;
  }

  /** Get the role of a member */
  getRole(entity: Entity): SquadRole | undefined {
    return this.members.get(entity)?.role;
  }

  get memberCount(): number { return this.members.size; }
  get activeAttackers(): number { return this.attackTokens.size; }
  get maxAttackTokens(): number { return this.maxAttackers; }

  getTarget(): PositionLike | null { return this.target; }

  /** Set max simultaneous attackers */
  setMaxAttackers(max: number): this {
    this.maxAttackers = max;
    return this;
  }

  destroy(): void {
    this.members.clear();
    this.attackTokens.clear();
    this.target = null;
  }
}
