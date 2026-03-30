import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { InputManager } from '../input/InputManager';
import { SceneDirector } from './SceneDirector';
import { AudioManager } from '../audio/AudioManager';
import { SaveManager } from '../save/SaveManager';
import { EntityRegistry } from '../entity/EntityRegistry';
import { StateInspector } from '../debug/StateInspector';
import type { ClikGameConfig } from '../utils/types';

export class BaseScene extends Phaser.Scene {
  protected debugEnabled = false;

  private _actions: InputManager | undefined;
  private _director: SceneDirector | undefined;
  private _audio: AudioManager | undefined;
  private _save: SaveManager | undefined;
  private _entities: EntityRegistry | undefined;
  private _clikConfig: ClikGameConfig | undefined;
  private _shuttingDown = false;

  /** Input manager — created on first access */
  protected get actions(): InputManager {
    if (this._shuttingDown) throw new Error('Cannot access actions after scene shutdown');
    if (!this._actions) {
      this._actions = new InputManager(this, this._clikConfig?.input);
    }
    return this._actions;
  }

  /** Scene transition director — created on first access */
  protected get director(): SceneDirector {
    if (!this._director) {
      this._director = new SceneDirector(this);
    }
    return this._director;
  }

  /** Audio manager — created on first access */
  protected get audio(): AudioManager {
    if (this._shuttingDown) throw new Error('Cannot access audio after scene shutdown');
    if (!this._audio) {
      this._audio = new AudioManager(this);
    }
    return this._audio;
  }

  /** Save manager — created on first access */
  protected get save(): SaveManager {
    if (!this._save) {
      this._save = new SaveManager(this._clikConfig?.name ?? 'clik-game', this._clikConfig?.save);
    }
    return this._save;
  }

  /** Entity registry — created on first access, auto-updates in update() */
  protected get entities(): EntityRegistry {
    if (!this._entities) {
      this._entities = new EntityRegistry();
    }
    return this._entities;
  }

  init(data?: object): void {
    this._shuttingDown = false;
    this._clikConfig = this.game.registry.get('__clikConfig') as ClikGameConfig | undefined;
    this.debugEnabled = this._clikConfig?.debug ?? false;
    ConsoleReporter.scene(`init: ${this.scene.key}`, data);
  }

  create(): void {
    ConsoleReporter.scene(`create: ${this.scene.key}`);
  }

  update(time: number, delta: number): void {
    this._actions?.update();
    this._entities?.updateAll(delta);
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
    this._shuttingDown = true;
    this._actions?.destroy();
    this._audio?.destroy();
    this._entities?.clear();
    this._actions = undefined;
    this._director = undefined;
    this._audio = undefined;
    this._save = undefined;
    this._entities = undefined;
  }
}
