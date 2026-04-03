import { EntityRegistry } from '../EntityRegistry';
import { Hitbox } from '../components/Hitbox';
import { Hurtbox } from '../components/Hurtbox';
import { Health } from '../components/Health';
import type { DamageEvent, WorldBox } from './DamageTypes';

/**
 * Manages combat collision detection between hitboxes and hurtboxes.
 * Uses EntityRegistry component index for broad-phase, custom AABB for narrow-phase.
 */
export class CombatManager {
  private registry: EntityRegistry;
  private damageCallbacks: ((event: DamageEvent) => void)[] = [];
  private killCallbacks: ((event: DamageEvent) => void)[] = [];

  constructor(registry: EntityRegistry) {
    this.registry = registry;
  }

  /** Check all hitbox vs hurtbox collisions this frame */
  checkCollisions(): DamageEvent[] {
    const events: DamageEvent[] = [];
    const hitboxEntities = this.registry.getByComponent('hitbox');
    const processed = new Set<string>();

    for (const attacker of hitboxEntities) {
      if (!attacker.active) continue;
      const hitbox = attacker.getComponent<Hitbox>('hitbox');
      if (!hitbox) continue;
      const attackBoxes = hitbox.getWorldBoxes();
      if (attackBoxes.length === 0) continue;

      // Use spatial query if available, otherwise check all hurtbox entities
      const candidates = this.registry.isSpatialEnabled
        ? this.registry.getNearby(attacker.x, attacker.y, 200)
        : this.registry.getByComponent('hurtbox');

      for (const defender of candidates) {
        if (!defender.active || defender === attacker) continue;
        const hurtbox = defender.getComponent<Hurtbox>('hurtbox');
        if (!hurtbox || hurtbox.isInvincible) continue;

        // Deduplicate per attacker/defender pair this frame
        const pairKey = `${attacker.x},${attacker.y}-${defender.x},${defender.y}`;
        if (processed.has(pairKey)) continue;

        const defenseBoxes = hurtbox.getWorldBoxes();
        if (defenseBoxes.length === 0) continue;

        // Narrow-phase: AABB intersection
        let hit = false;
        let hitboxDef = hitbox.getBoxes()[0];
        for (const aBox of attackBoxes) {
          for (const dBox of defenseBoxes) {
            if (aabbIntersects(aBox, dBox)) {
              hit = true;
              // Find the matching hitbox def for damage info
              const matchingDef = hitbox.getBoxes().find(b => b.tag === aBox.tag);
              if (matchingDef) hitboxDef = matchingDef;
              break;
            }
          }
          if (hit) break;
        }

        if (hit) {
          processed.add(pairKey);
          const event: DamageEvent = {
            source: attacker,
            target: defender,
            amount: hitboxDef?.damageAmount ?? 1,
            type: hitboxDef?.damageType ?? 'physical',
          };
          events.push(event);
        }
      }
    }

    return events;
  }

  /** Apply a damage event to the target's Health component */
  applyDamage(event: DamageEvent): void {
    const health = event.target.getComponent<Health>('health');
    if (!health) return;

    const result = health.takeDamage(event);
    if (!result.blocked) {
      for (const cb of this.damageCallbacks) cb(event);

      if (health.isDead) {
        for (const cb of this.killCallbacks) cb(event);
      }
    }
  }

  /** Run collision detection and apply all damage */
  update(): void {
    const events = this.checkCollisions();
    for (const event of events) {
      this.applyDamage(event);
    }
  }

  /** Register a callback for when damage is dealt */
  onDamage(callback: (event: DamageEvent) => void): this {
    this.damageCallbacks.push(callback);
    return this;
  }

  /** Register a callback for when an entity is killed */
  onKill(callback: (event: DamageEvent) => void): this {
    this.killCallbacks.push(callback);
    return this;
  }
}

function aabbIntersects(a: WorldBox, b: WorldBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
