import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: '__clik_ui' });
  }

  create(): void {
    ConsoleReporter.scene('UIScene active');
  }

  addElement(element: Phaser.GameObjects.GameObject): void {
    this.add.existing(element);
  }
}
