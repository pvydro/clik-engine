import type Phaser from 'phaser';
import { Color } from '../utils/color';

export interface HUDCounterConfig {
  label: string;
  x: number;
  y: number;
  color?: number;
  warningThreshold?: number;
  warningColor?: number;
  fontSize?: number;
  labelFontSize?: number;
}

interface HUDCounter {
  config: HUDCounterConfig;
  value: number;
  labelText: Phaser.GameObjects.Text;
  valueText: Phaser.GameObjects.Text;
}

interface HUDLabel {
  text: Phaser.GameObjects.Text;
}

/**
 * Animated score/stats display with rolling numbers, flash feedback, and warning states.
 */
export class AnimatedHUD {
  private scene: Phaser.Scene;
  private counters = new Map<string, HUDCounter>();
  private labels = new Map<string, HUDLabel>();
  private fontFamily: string;
  private depth: number;

  constructor(scene: Phaser.Scene, config?: { fontFamily?: string; depth?: number }) {
    this.scene = scene;
    this.fontFamily = config?.fontFamily ?? 'monospace';
    this.depth = config?.depth ?? 100;
  }

  /**
   * Add a counter with label.
   */
  addCounter(id: string, config: HUDCounterConfig): void {
    const color = Color.numberToHex(config.color ?? 0x88c0d0);
    const labelFontSize = config.labelFontSize ?? 12;
    const fontSize = config.fontSize ?? 24;

    const labelText = this.scene.add.text(config.x, config.y - fontSize * 0.7, config.label, {
      fontSize: `${labelFontSize}px`,
      fontFamily: this.fontFamily,
      color: '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(this.depth);

    const valueText = this.scene.add.text(config.x, config.y, '0', {
      fontSize: `${fontSize}px`,
      fontFamily: this.fontFamily,
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(this.depth);

    this.counters.set(id, { config, value: 0, labelText, valueText });
  }

  /**
   * Update a counter value with animation (roll, flash, punch).
   */
  updateCounter(id: string, value: number): void {
    const counter = this.counters.get(id);
    if (!counter) return;

    const oldVal = counter.value;
    counter.value = value;

    const color = Color.numberToHex(counter.config.color ?? 0x88c0d0);
    const warningColor = Color.numberToHex(counter.config.warningColor ?? 0xff0044);

    // Check warning
    const isWarning = counter.config.warningThreshold !== undefined && value <= counter.config.warningThreshold;

    // Flash white then back
    counter.valueText.setColor('#ffffff');
    this.scene.time.delayedCall(150, () => {
      counter.valueText.setColor(isWarning ? warningColor : color);
    });

    // Scale punch
    const punchScale = isWarning ? 1.3 : 1.2;
    this.scene.tweens.add({
      targets: counter.valueText,
      scaleX: punchScale,
      scaleY: punchScale,
      duration: isWarning ? 100 : 80,
      ease: isWarning ? 'Back.easeOut' : 'Quad.easeOut',
      yoyo: true,
    });

    // Number roll
    const obj = { val: oldVal };
    this.scene.tweens.add({
      targets: obj,
      val: value,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        counter.valueText.setText(String(Math.round(obj.val)));
      },
    });
  }

  /**
   * Get current displayed value.
   */
  getCounter(id: string): number {
    return this.counters.get(id)?.value ?? 0;
  }

  /**
   * Add a label-only display (no animation).
   */
  addLabel(id: string, config: { label: string; x: number; y: number; color?: number }): void {
    const color = Color.numberToHex(config.color ?? 0xcccccc);
    const text = this.scene.add.text(config.x, config.y, config.label, {
      fontSize: '14px',
      fontFamily: this.fontFamily,
      color,
    }).setOrigin(0.5).setDepth(this.depth);

    this.labels.set(id, { text });
  }

  /**
   * Update label text.
   */
  updateLabel(id: string, newText: string): void {
    const label = this.labels.get(id);
    if (label) label.text.setText(newText);
  }

  destroy(): void {
    for (const c of this.counters.values()) {
      c.labelText.destroy();
      c.valueText.destroy();
    }
    for (const l of this.labels.values()) {
      l.text.destroy();
    }
    this.counters.clear();
    this.labels.clear();
  }
}
