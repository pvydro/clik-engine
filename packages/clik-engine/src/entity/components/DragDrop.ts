import Phaser from 'phaser';
import { Component } from '../Component';
import { ConsoleReporter } from '../../debug/ConsoleReporter';

export class DragDrop extends Component {
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private originalX = 0;
  private originalY = 0;
  private onDropCallback?: (x: number, y: number) => boolean;
  private onDragStartCallback?: () => void;
  private snapBackOnFail = true;

  constructor(snapBackOnFail = true) {
    super();
    this.snapBackOnFail = snapBackOnFail;
  }

  onAttach(): void {
    const entity = this.entity;
    entity.setInteractive({ draggable: true, useHandCursor: true });

    entity.on('dragstart', (_pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.originalX = entity.x;
      this.originalY = entity.y;
      this.onDragStartCallback?.();
      entity.setDepth(entity.depth + 1000);
    });

    entity.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      entity.x = dragX;
      entity.y = dragY;
    });

    entity.on('dragend', () => {
      this.isDragging = false;
      entity.setDepth(entity.depth - 1000);

      const accepted = this.onDropCallback?.(entity.x, entity.y) ?? true;
      if (!accepted && this.snapBackOnFail) {
        entity.x = this.originalX;
        entity.y = this.originalY;
        ConsoleReporter.input('drag: snapped back');
      } else {
        ConsoleReporter.input(`drag: dropped at (${entity.x.toFixed(0)}, ${entity.y.toFixed(0)})`);
      }
    });

    // Enable drag in the scene's input
    entity.scene.input.setDraggable(entity);
  }

  onDrop(callback: (x: number, y: number) => boolean): this {
    this.onDropCallback = callback;
    return this;
  }

  onDragStart(callback: () => void): this {
    this.onDragStartCallback = callback;
    return this;
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  getOriginalPosition(): { x: number; y: number } {
    return { x: this.originalX, y: this.originalY };
  }
}
