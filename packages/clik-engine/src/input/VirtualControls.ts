import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface VirtualControlsConfig {
  joystick?: boolean | { floating?: boolean; deadzone?: number; range?: number };
  dpad?: boolean;
  buttons?: { key: string; label: string; x?: number; y?: number }[];
  opacity?: number;
  autoHideOnDesktop?: boolean;
}

export class VirtualControls extends Phaser.Scene {
  private config: VirtualControlsConfig = {};
  private activeDirections: Set<string> = new Set();
  private activeButtons: Set<string> = new Set();
  private joystickValue = { x: 0, y: 0 };

  // Joystick components
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private joystickActive = false;
  private joystickOriginX = 0;
  private joystickOriginY = 0;

  constructor() {
    super({ key: '__clik_virtual_controls' });
  }

  init(data?: VirtualControlsConfig): void {
    if (data) this.config = data;
  }

  create(): void {
    const isMobile = !this.sys.game.device.os.desktop;
    if ((this.config.autoHideOnDesktop ?? true) && !isMobile) return;

    const { width, height } = this.scale;
    const opacity = this.config.opacity ?? 0.4;

    if (this.config.dpad) {
      this.createDPad(100, height - 120, opacity);
    }

    if (this.config.joystick) {
      const joyConfig = typeof this.config.joystick === 'object' ? this.config.joystick : {};
      if (joyConfig.floating) {
        this.createFloatingJoystick(opacity, joyConfig.deadzone ?? 0.15, joyConfig.range ?? 60);
      } else {
        this.createFixedJoystick(120, height - 120, opacity, joyConfig.deadzone ?? 0.15, joyConfig.range ?? 60);
      }
    }

    if (this.config.buttons) {
      const startX = width - 80;
      this.config.buttons.forEach((btn, i) => {
        const bx = btn.x ?? startX - i * 80;
        const by = btn.y ?? height - 120;
        this.createButton(bx, by, btn.key, btn.label, opacity);
      });
    }

    ConsoleReporter.input('Virtual controls created');
  }

  private createDPad(cx: number, cy: number, alpha: number): void {
    const size = 50;
    const gap = 4;
    const dirs = [
      { key: 'up', x: 0, y: -(size + gap), label: '\u25B2' },
      { key: 'down', x: 0, y: size + gap, label: '\u25BC' },
      { key: 'left', x: -(size + gap), y: 0, label: '\u25C0' },
      { key: 'right', x: size + gap, y: 0, label: '\u25B6' },
    ];

    for (const dir of dirs) {
      const btn = this.add.rectangle(cx + dir.x, cy + dir.y, size, size, 0x444444, alpha)
        .setInteractive()
        .on('pointerdown', () => { this.activeDirections.add(dir.key); btn.setFillStyle(0x00ff88, 0.7); })
        .on('pointerup', () => { this.activeDirections.delete(dir.key); btn.setFillStyle(0x444444, alpha); })
        .on('pointerout', () => { this.activeDirections.delete(dir.key); btn.setFillStyle(0x444444, alpha); });

      this.add.text(cx + dir.x, cy + dir.y, dir.label, {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5).setAlpha(alpha + 0.2);
    }
  }

  private createFixedJoystick(cx: number, cy: number, alpha: number, deadzone: number, range: number): void {
    this.joystickOriginX = cx;
    this.joystickOriginY = cy;
    this.joystickBase = this.add.circle(cx, cy, range, 0x444444, alpha * 0.5).setInteractive();
    this.joystickThumb = this.add.circle(cx, cy, 25, 0x888888, alpha);
    this.setupJoystickInput(deadzone, range);
  }

  private createFloatingJoystick(alpha: number, deadzone: number, range: number): void {
    // Joystick appears where you touch on the left half of screen
    const { width, height } = this.scale;

    // Invisible touch zone on left half
    const touchZone = this.add.rectangle(width / 4, height / 2, width / 2, height, 0x000000, 0)
      .setInteractive();

    this.joystickBase = this.add.circle(0, 0, range, 0x444444, alpha * 0.5).setVisible(false);
    this.joystickThumb = this.add.circle(0, 0, 25, 0x888888, alpha).setVisible(false);

    touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.joystickOriginX = pointer.x;
      this.joystickOriginY = pointer.y;
      this.joystickBase!.setPosition(pointer.x, pointer.y).setVisible(true);
      this.joystickThumb!.setPosition(pointer.x, pointer.y).setVisible(true);
      this.joystickActive = true;
    });

    this.setupJoystickInput(deadzone, range);

    this.input.on('pointerup', () => {
      this.joystickBase?.setVisible(false);
      this.joystickThumb?.setVisible(false);
      this.joystickActive = false;
      this.joystickValue = { x: 0, y: 0 };
    });
  }

  private setupJoystickInput(deadzone: number, range: number): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.joystickThumb) return;

      const dx = pointer.x - this.joystickOriginX;
      const dy = pointer.y - this.joystickOriginY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, range);

      if (dist > 0) {
        const nx = (dx / dist) * clampedDist;
        const ny = (dy / dist) * clampedDist;
        this.joystickThumb.setPosition(this.joystickOriginX + nx, this.joystickOriginY + ny);

        const normX = nx / range;
        const normY = ny / range;
        this.joystickValue = {
          x: Math.abs(normX) > deadzone ? normX : 0,
          y: Math.abs(normY) > deadzone ? normY : 0,
        };
      }
    });

    this.input.on('pointerup', () => {
      this.joystickThumb?.setPosition(this.joystickOriginX, this.joystickOriginY);
      this.joystickValue = { x: 0, y: 0 };
    });
  }

  private createButton(x: number, y: number, key: string, label: string, alpha: number): void {
    const btn = this.add.circle(x, y, 30, 0x444444, alpha)
      .setInteractive()
      .on('pointerdown', () => { this.activeButtons.add(key); btn.setFillStyle(0x00ff88, 0.7); })
      .on('pointerup', () => { this.activeButtons.delete(key); btn.setFillStyle(0x444444, alpha); })
      .on('pointerout', () => { this.activeButtons.delete(key); btn.setFillStyle(0x444444, alpha); });

    this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(alpha + 0.3);
  }

  isDirectionDown(dir: string): boolean {
    return this.activeDirections.has(dir);
  }

  isButtonDown(key: string): boolean {
    return this.activeButtons.has(key);
  }

  getJoystick(): { x: number; y: number } {
    return this.joystickValue;
  }

  toggle(): void {
    this.scene.setVisible(!this.scene.isVisible());
  }
}
