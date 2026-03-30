import Phaser from 'phaser';

export type AnchorPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface AnchorConfig {
  position: AnchorPosition;
  offsetX?: number;
  offsetY?: number;
  /** Use percentage of screen size (0-1) instead of fixed offset */
  percentX?: number;
  percentY?: number;
}

/**
 * Anchor a game object to a screen position.
 * Automatically repositions on resize.
 */
export class Anchor {
  /**
   * Anchor a target to a screen position with auto-reposition on resize.
   * Returns a cleanup function to remove the resize listener.
   */
  static apply(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Transform,
    config: AnchorConfig,
  ): () => void {
    const update = () => {
      const { width, height } = scene.scale;
      const ox = config.offsetX ?? 0;
      const oy = config.offsetY ?? 0;
      const px = (config.percentX ?? 0) * width;
      const py = (config.percentY ?? 0) * height;

      let x = 0, y = 0;

      switch (config.position) {
        case 'top-left':      x = ox + px;             y = oy + py; break;
        case 'top-center':    x = width / 2 + ox + px; y = oy + py; break;
        case 'top-right':     x = width - ox + px;     y = oy + py; break;
        case 'center-left':   x = ox + px;             y = height / 2 + oy + py; break;
        case 'center':        x = width / 2 + ox + px; y = height / 2 + oy + py; break;
        case 'center-right':  x = width - ox + px;     y = height / 2 + oy + py; break;
        case 'bottom-left':   x = ox + px;             y = height - oy + py; break;
        case 'bottom-center': x = width / 2 + ox + px; y = height - oy + py; break;
        case 'bottom-right':  x = width - ox + px;     y = height - oy + py; break;
      }

      target.setPosition(x, y);
    };

    // Apply immediately
    update();

    // Update on resize
    scene.scale.on(Phaser.Scale.Events.RESIZE, update);

    // Return cleanup function
    return () => scene.scale.off(Phaser.Scale.Events.RESIZE, update);
  }

  /** Helper: center a game object on screen */
  static center(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, offsetX = 0, offsetY = 0): void {
    Anchor.apply(scene, target, { position: 'center', offsetX, offsetY });
  }

  /** Helper: pin to top-left corner */
  static topLeft(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, marginX = 16, marginY = 16): void {
    Anchor.apply(scene, target, { position: 'top-left', offsetX: marginX, offsetY: marginY });
  }

  /** Helper: pin to top-right corner */
  static topRight(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, marginX = 16, marginY = 16): void {
    Anchor.apply(scene, target, { position: 'top-right', offsetX: marginX, offsetY: marginY });
  }

  /** Helper: pin to bottom-center */
  static bottomCenter(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, offsetY = 30): void {
    Anchor.apply(scene, target, { position: 'bottom-center', offsetY });
  }
}
