import Phaser from 'phaser';
import { themedColor, themedTextColor, themedFont, themedFontSize } from './themed';

export interface RadioOption {
  label: string;
  value: string;
}

export interface RadioGroupConfig {
  x: number;
  y: number;
  options: RadioOption[];
  selected?: string;
  layout?: 'vertical' | 'horizontal';
  spacing?: number;
  size?: number;
  radioColor?: number;
  selectedColor?: number;
  labelColor?: string;
  fontSize?: string;
  onChange?: (value: string) => void;
}

/**
 * Canvas-rendered radio button group — single selection, mutually exclusive.
 */
export class RadioGroup extends Phaser.GameObjects.Container {
  private _selectedValue: string | null;
  private radioConfig: RadioGroupConfig;
  private dots: Map<string, { outer: Phaser.GameObjects.Arc; inner: Phaser.GameObjects.Arc }> = new Map();

  constructor(scene: Phaser.Scene, config: RadioGroupConfig) {
    super(scene, config.x, config.y);
    this.radioConfig = config;
    this._selectedValue = config.selected ?? null;

    const layout = config.layout ?? 'vertical';
    const spacing = config.spacing ?? 30;
    const size = config.size ?? 10;
    const radioColor = themedColor(config.radioColor, 'secondary');
    const selectedColor = themedColor(config.selectedColor, 'primary');

    config.options.forEach((opt, i) => {
      const ox = layout === 'horizontal' ? i * spacing * 4 : 0;
      const oy = layout === 'vertical' ? i * spacing : 0;

      const outer = scene.add.circle(ox, oy, size, 0x000000, 0)
        .setStrokeStyle(2, radioColor)
        .setInteractive({ useHandCursor: true });

      const inner = scene.add.circle(ox, oy, size - 4, selectedColor)
        .setVisible(this._selectedValue === opt.value);

      outer.on('pointerup', () => this.select(opt.value));

      const label = scene.add.text(ox + size + 8, oy, opt.label, {
        fontSize: themedFontSize(config.fontSize),
        fontFamily: themedFont(undefined),
        color: themedTextColor(config.labelColor),
      }).setOrigin(0, 0.5);

      this.add([outer, inner, label]);
      this.dots.set(opt.value, { outer, inner });
    });

    scene.add.existing(this);
  }

  select(value: string): void {
    if (this._selectedValue === value) return;
    this._selectedValue = value;

    // Update visual state
    for (const [v, dot] of this.dots) {
      dot.inner.setVisible(v === value);
    }

    this.radioConfig.onChange?.(value);
    this.emit('change', value);
  }

  get selectedValue(): string | null {
    return this._selectedValue;
  }

  setSelected(value: string): this {
    this.select(value);
    return this;
  }
}
