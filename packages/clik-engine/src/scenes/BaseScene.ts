import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { InputManager } from '../input/InputManager';
import { SceneDirector } from './SceneDirector';
import { AudioManager } from '../audio/AudioManager';
import { SaveManager } from '../save/SaveManager';
import { EntityRegistry } from '../entity/EntityRegistry';
import { StateInspector } from '../debug/StateInspector';
import type { ClikGameConfig } from '../utils/types';
import type { PluginManager } from '../plugin/PluginManager';
import { NetworkManager } from '../network/NetworkManager';
import { Lobby } from '../network/Lobby';
import { Room } from '../network/Room';
import { A11yManager } from '../accessibility/A11yManager';

export class BaseScene extends Phaser.Scene {
  protected debugEnabled = false;

  private _actions: InputManager | undefined;
  private _director: SceneDirector | undefined;
  private _audio: AudioManager | undefined;
  private _save: SaveManager | undefined;
  private _entities: EntityRegistry | undefined;
  private _network: NetworkManager | undefined;
  private _lobby: Lobby | undefined;
  private _room: Room | undefined;
  private _a11y: A11yManager | undefined;
  private _clikConfig: ClikGameConfig | undefined;
  private _shuttingDown = false;
  private _hasError = false;

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

  /** Network manager — created on first access from config.network */
  protected get network(): NetworkManager {
    if (this._shuttingDown) throw new Error('Cannot access network after scene shutdown');
    if (!this._network) {
      const netConfig = this._clikConfig?.network;
      if (!netConfig?.url) {
        throw new Error('NetworkManager requires config.network.url. Add network config to createGame().');
      }
      this._network = new NetworkManager(netConfig);
    }
    return this._network;
  }

  /** Lobby client — created on first access, depends on network */
  protected get lobby(): Lobby {
    if (!this._lobby) {
      this._lobby = new Lobby(this.network);
    }
    return this._lobby;
  }

  /** Room client — created on first access, depends on network */
  protected get room(): Room {
    if (!this._room) {
      this._room = new Room(this.network);
    }
    return this._room;
  }

  /** Accessibility manager — created on first access */
  protected get a11y(): A11yManager {
    if (!this._a11y) {
      this._a11y = new A11yManager(this.game, this._clikConfig?.accessibility);
      // Store in registry so UI components (UIAnimator) can check reducedMotion
      this.game.registry.set('__clikA11y', this._a11y);
    }
    return this._a11y;
  }

  init(data?: object): void {
    this._shuttingDown = false;
    this._hasError = false;
    this._clikConfig = this.game.registry.get('__clikConfig') as ClikGameConfig | undefined;
    this.debugEnabled = this._clikConfig?.debug ?? false;
    ConsoleReporter.scene(`init: ${this.scene.key}`, data);
  }

  create(): void {
    ConsoleReporter.scene(`create: ${this.scene.key}`);
    // Notify plugins
    const pm = this.game.registry.get('__clikPluginManager') as PluginManager | undefined;
    pm?.onSceneCreate(this);
  }

  update(time: number, delta: number): void {
    if (this._hasError) return;
    this._actions?.update();
    this._entities?.updateAll(delta);
    // Notify plugins
    const pm = this.game.registry.get('__clikPluginManager') as PluginManager | undefined;
    pm?.onSceneUpdate(this, time, delta);
  }

  /** Wraps a scene lifecycle method with error handling. Call from subclass overrides if desired. */
  protected runSafe(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      this._hasError = true;
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      ConsoleReporter.error(
        `Scene '${this.scene.key}' error: ${message}`,
        'Check the console for the full stack trace. The scene update loop has been paused.'
      );
      if (stack) console.error(stack);

      // Show red error banner if debug mode is on
      if (this.debugEnabled) {
        this._showErrorBanner(message);
      }
    }
  }

  private _showErrorBanner(message: string): void {
    try {
      const cam = this.cameras.main;
      const bg = this.add.rectangle(cam.width / 2, 30, cam.width, 40, 0xcc0000, 0.9).setScrollFactor(0).setDepth(99999);
      const text = this.add.text(cam.width / 2, 30, `ERROR: ${message}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(99999);
    } catch {
      // If even the banner fails, just log
    }
  }

  /** Returns the entity registry if it has been initialized, without lazy-creating it. */
  public getEntityRegistry(): EntityRegistry | undefined {
    return this._entities;
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
    // Notify plugins
    const pm = this.game?.registry?.get('__clikPluginManager') as PluginManager | undefined;
    pm?.onSceneShutdown(this);
    // Don't destroy actions — Phaser handles keyboard cleanup on restart.
    // Destroying key objects here conflicts with Phaser's own shutdown sequence.
    this._audio?.destroy();
    this._entities?.clear();
    this._lobby?.destroy();
    this._room?.destroy();
    this._network?.destroy();
    this._actions = undefined;
    this._director = undefined;
    this._audio = undefined;
    this._save = undefined;
    this._entities = undefined;
    this._network = undefined;
    this._lobby = undefined;
    this._room = undefined;
    this._a11y = undefined;
  }
}
