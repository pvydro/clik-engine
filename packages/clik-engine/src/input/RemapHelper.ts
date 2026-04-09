import type Phaser from 'phaser';

/**
 * Helper for input remapping in settings menus.
 * Listens for the next key press or gamepad button and returns it.
 */
export class RemapHelper {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Wait for the next keyboard key press.
   * Returns the key name (e.g. 'UP', 'SPACE', 'A').
   * Call cancel() on the returned handle to abort.
   */
  listenForKey(callback: (keyName: string) => void): { cancel: () => void } {
    let cancelled = false;

    const handler = (event: KeyboardEvent) => {
      if (cancelled) return;
      cancelled = true;
      this.scene.input.keyboard?.off('keydown', handler);
      callback(event.key.toUpperCase());
    };

    this.scene.input.keyboard?.on('keydown', handler);

    return {
      cancel: () => {
        cancelled = true;
        this.scene.input.keyboard?.off('keydown', handler);
      },
    };
  }

  /**
   * Wait for the next gamepad button press.
   * Returns the button index as a string (e.g. '0', '1', '2').
   */
  listenForGamepadButton(callback: (buttonIndex: string) => void): { cancel: () => void } {
    let cancelled = false;
    let checkTimer: Phaser.Time.TimerEvent | null = null;

    const check = () => {
      if (cancelled) return;
      const gamepad = this.scene.input.gamepad?.pad1;
      if (!gamepad) return;

      for (let i = 0; i < gamepad.buttons.length; i++) {
        if (gamepad.buttons[i].pressed) {
          cancelled = true;
          checkTimer?.destroy();
          callback(String(i));
          return;
        }
      }
    };

    // Poll every frame via timer
    checkTimer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: check,
    });

    return {
      cancel: () => {
        cancelled = true;
        checkTimer?.destroy();
      },
    };
  }
}
