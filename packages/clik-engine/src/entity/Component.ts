import type { Entity } from './Entity';

export abstract class Component {
  entity!: Entity;
  enabled = true;

  /** Called when the component is added to an entity */
  onAttach(): void {}

  /** Called every frame */
  update(delta: number): void {}

  /** Called when the component is removed or entity is destroyed */
  onDetach(): void {}

  /** Called when the owning entity is recycled from a pool. Reset internal state to defaults. */
  reset(): void {}
}
