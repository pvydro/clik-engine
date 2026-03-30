import Phaser from 'phaser';
import { Component } from '../Component';
import { ConsoleReporter } from '../../debug/ConsoleReporter';

export interface InteractableConfig {
  /** Hit area width (defaults to entity bounds) */
  width?: number;
  /** Hit area height */
  height?: number;
  /** Cursor style on hover */
  cursor?: boolean;
}

/**
 * Makes an entity interactive — handles hover, click, and interaction zones.
 * Useful for NPCs, items, doors, switches.
 */
export class Interactable extends Component {
  private config: InteractableConfig;
  private hovered = false;
  private onClickCb?: () => void;
  private onHoverEnterCb?: () => void;
  private onHoverExitCb?: () => void;
  private onInteractCb?: () => void;
  private interactRange = 0;

  constructor(config?: InteractableConfig) {
    super();
    this.config = config ?? {};
  }

  onAttach(): void {
    const entity = this.entity;
    const w = this.config.width ?? 32;
    const h = this.config.height ?? 32;

    entity.setSize(w, h);
    entity.setInteractive({
      useHandCursor: this.config.cursor ?? true,
      hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    });

    entity.on('pointerover', () => {
      this.hovered = true;
      this.onHoverEnterCb?.();
    });

    entity.on('pointerout', () => {
      this.hovered = false;
      this.onHoverExitCb?.();
    });

    entity.on('pointerup', () => {
      ConsoleReporter.input(`interact: ${entity.entityType}`);
      this.onClickCb?.();
    });
  }

  onClick(callback: () => void): this {
    this.onClickCb = callback;
    return this;
  }

  onHoverEnter(callback: () => void): this {
    this.onHoverEnterCb = callback;
    return this;
  }

  onHoverExit(callback: () => void): this {
    this.onHoverExitCb = callback;
    return this;
  }

  /**
   * Set up proximity-based interaction. Call `checkInteraction(player)`
   * each frame — fires the callback when player is in range and presses interact.
   */
  onInteract(callback: () => void, range = 50): this {
    this.onInteractCb = callback;
    this.interactRange = range;
    return this;
  }

  /**
   * Check if a game object is within interaction range.
   * Call this in update() with the player reference.
   */
  isInRange(other: Phaser.GameObjects.GameObject & { x: number; y: number }): boolean {
    if (this.interactRange <= 0) return false;
    const ox = other.x;
    const oy = other.y;
    const dx = ox - this.entity.x;
    const dy = oy - this.entity.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.interactRange;
  }

  /**
   * Attempt interaction — fires callback if in range.
   */
  tryInteract(other: Phaser.GameObjects.GameObject & { x: number; y: number }): boolean {
    if (this.isInRange(other)) {
      this.onInteractCb?.();
      return true;
    }
    return false;
  }

  isHovered(): boolean {
    return this.hovered;
  }
}
