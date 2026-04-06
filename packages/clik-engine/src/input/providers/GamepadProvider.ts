import Phaser from 'phaser';
import { ConsoleReporter } from '../../debug/ConsoleReporter';
import type { ActionMap } from '../ActionMap';
import type { InputProvider } from './InputProvider';

/**
 * Gamepad input provider — detects gamepad connection
 * and maps buttons to actions via ActionMap gamepad bindings.
 * Binds to game.input.gamepad so state survives scene transitions.
 */
export class GamepadProvider implements InputProvider {
  private game: Phaser.Game;
  private actionMap: ActionMap;
  private gamepadIndex: number | null = null;
  private connectedHandler: ((pad: Phaser.Input.Gamepad.Gamepad) => void) | null = null;
  private disconnectedHandler: ((pad: Phaser.Input.Gamepad.Gamepad) => void) | null = null;
  private deadzone: number;

  constructor(game: Phaser.Game, actionMap: ActionMap, deadzone = 0.15) {
    this.game = game;
    this.actionMap = actionMap;
    this.deadzone = deadzone;

    if (!game.input.gamepad) return;

    this.connectedHandler = (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepadIndex = pad.index;
      ConsoleReporter.input(`Gamepad connected: ${pad.id}`);
    };
    game.input.gamepad.on('connected', this.connectedHandler);

    this.disconnectedHandler = (pad: Phaser.Input.Gamepad.Gamepad) => {
      if (this.gamepadIndex === pad.index) {
        this.gamepadIndex = null;
        ConsoleReporter.input(`Gamepad disconnected: ${pad.id}`);
      }
    };
    game.input.gamepad.on('disconnected', this.disconnectedHandler);

    // Check for already-connected gamepads
    if (game.input.gamepad.total > 0) {
      this.gamepadIndex = game.input.gamepad.pad1?.index ?? null;
    }
  }

  update(): void {
    // Gamepad state polled directly in isActionDown
  }

  isActionDown(action: string): boolean {
    if (this.gamepadIndex === null) return false;
    const gamepad = this.game.input.gamepad?.getPad(this.gamepadIndex);
    if (!gamepad) return false;

    const binding = this.actionMap.getGamepad(action);
    if (!binding) return false;

    const btnIndex = parseInt(binding, 10);
    return !isNaN(btnIndex) && (gamepad.buttons[btnIndex]?.pressed ?? false);
  }

  consumeAction(_action: string): boolean {
    return false; // Gamepad buttons are continuous
  }

  /** Get analog stick values with deadzone */
  getAxis(): { x: number; y: number } {
    if (this.gamepadIndex === null) return { x: 0, y: 0 };
    const gamepad = this.game.input.gamepad?.getPad(this.gamepadIndex);
    if (!gamepad) return { x: 0, y: 0 };

    const stickX = gamepad.leftStick.x;
    const stickY = gamepad.leftStick.y;
    return {
      x: Math.abs(stickX) > this.deadzone ? stickX : 0,
      y: Math.abs(stickY) > this.deadzone ? stickY : 0,
    };
  }

  hasGamepad(): boolean {
    return this.gamepadIndex !== null;
  }

  destroy(): void {
    if (this.game.input.gamepad) {
      if (this.connectedHandler) {
        this.game.input.gamepad.off('connected', this.connectedHandler);
      }
      if (this.disconnectedHandler) {
        this.game.input.gamepad.off('disconnected', this.disconnectedHandler);
      }
    }
  }
}
