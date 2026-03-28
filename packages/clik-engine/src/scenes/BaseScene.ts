import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { InputManager } from '../input/InputManager';
import { SceneDirector } from './SceneDirector';
import { AudioManager } from '../audio/AudioManager';
import { SaveManager } from '../save/SaveManager';
import { StateInspector } from '../debug/StateInspector';
import type { ClikGameInstance } from '../boot/ClikGame';

export class BaseScene extends Phaser.Scene {
  protected debugEnabled = false;
  protected actions!: InputManager;
  protected director!: SceneDirector;
  protected audio!: AudioManager;
  protected save!: SaveManager;

  init(data?: object): void {
    const clikConfig = (this.game as ClikGameInstance).__clikConfig;
    this.debugEnabled = clikConfig?.debug ?? false;
    this.actions = new InputManager(this, clikConfig?.input);
    this.director = new SceneDirector(this);
    this.audio = new AudioManager(this);
    this.save = new SaveManager(clikConfig?.name ?? 'clik-game', clikConfig?.save);
    ConsoleReporter.scene(`init: ${this.scene.key}`, data);
  }

  create(): void {
    ConsoleReporter.scene(`create: ${this.scene.key}`);
  }

  update(time: number, delta: number): void {
    this.actions.update();
  }

  onResize(width: number, height: number): void {
    // Subclasses override for responsive layout
  }

  inspectState(label: string, getter: () => Record<string, unknown>): void {
    const inspector = this.game.scene.getScene('__clik_state_inspector') as StateInspector | null;
    inspector?.inspect(label, getter);
  }

  uninspectState(label: string): void {
    const inspector = this.game.scene.getScene('__clik_state_inspector') as StateInspector | null;
    inspector?.uninspect(label);
  }

  shutdown(): void {
    ConsoleReporter.scene(`shutdown: ${this.scene.key}`);
  }
}
