import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { themedColor, themedTextColor, themedFont, themedFontSize } from './themed';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  options: DropdownOption[];
  selected?: string;
  placeholder?: string;
  backgroundColor?: number;
  hoverColor?: number;
  textColor?: string;
  fontSize?: string;
  maxVisibleItems?: number;
  onChange?: (value: string, label: string) => void;
}

/**
 * Dropdown/select component rendered on Phaser canvas.
 * Opens a list of options, supports keyboard navigation.
 */
export class Dropdown extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private optionContainer: Phaser.GameObjects.Container | null = null;
  private dropdownConfig: DropdownConfig;
  private _selectedValue: string | null;
  private _isOpen = false;
  private highlightIndex = -1;
  private pointerDownHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene, config: DropdownConfig) {
    super(scene, config.x, config.y);
    this.dropdownConfig = config;
    this._selectedValue = config.selected ?? null;

    const w = config.width ?? 180;
    const h = config.height ?? 36;

    this.bg = scene.add.rectangle(0, 0, w, h, themedColor(config.backgroundColor, 'surface'))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const displayText = this.getDisplayText();
    this.label = scene.add.text(-w / 2 + 10, 0, displayText, {
      fontSize: themedFontSize(config.fontSize),
      fontFamily: themedFont(undefined),
      color: themedTextColor(config.textColor),
    }).setOrigin(0, 0.5);

    this.arrow = scene.add.text(w / 2 - 20, 0, '\u25BC', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.add([this.bg, this.label, this.arrow]);
    this.setSize(w, h);

    // Toggle on click
    this.bg.on('pointerup', () => {
      if (this._isOpen) this.close();
      else this.open();
    });

    // Close on click outside
    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this._isOpen) return;
      const bounds = this.bg.getBounds();
      if (!bounds.contains(pointer.x, pointer.y)) {
        this.close();
      }
    };
    scene.input.on('pointerdown', this.pointerDownHandler);

    // Keyboard navigation
    if (scene.input.keyboard) {
      this.keyHandler = (event: KeyboardEvent) => {
        if (!this._isOpen) return;
        if (event.key === 'ArrowDown') {
          this.highlightIndex = Math.min(this.highlightIndex + 1, config.options.length - 1);
          this.updateHighlight();
        } else if (event.key === 'ArrowUp') {
          this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
          this.updateHighlight();
        } else if (event.key === 'Enter' && this.highlightIndex >= 0) {
          this.selectOption(config.options[this.highlightIndex]);
          this.close();
        } else if (event.key === 'Escape') {
          this.close();
        }
      };
      scene.input.keyboard.on('keydown', this.keyHandler);
    }

    scene.add.existing(this);
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.arrow.setText('\u25B2');

    const w = this.dropdownConfig.width ?? 180;
    const itemH = 32;
    const maxVisible = this.dropdownConfig.maxVisibleItems ?? 5;
    const visibleCount = Math.min(this.dropdownConfig.options.length, maxVisible);
    const hoverColor = this.dropdownConfig.hoverColor ?? 0x555555;

    this.optionContainer = this.scene.add.container(this.x, this.y + 20);
    this.optionContainer.setDepth(8500);

    const listBg = this.scene.add.rectangle(0, visibleCount * itemH / 2, w, visibleCount * itemH, 0x222222)
      .setOrigin(0.5, 0.5);
    this.optionContainer.add(listBg);

    this.dropdownConfig.options.forEach((opt, i) => {
      if (i >= maxVisible) return;
      const itemY = i * itemH + itemH / 2;
      const itemBg = this.scene.add.rectangle(0, itemY, w - 4, itemH - 2, 0x222222)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const itemText = this.scene.add.text(-w / 2 + 12, itemY, opt.label, {
        fontSize: this.dropdownConfig.fontSize ?? '14px',
        fontFamily: 'monospace',
        color: this._selectedValue === opt.value ? '#00ff88' : (this.dropdownConfig.textColor ?? '#ffffff'),
      }).setOrigin(0, 0.5);

      itemBg.on('pointerover', () => {
        itemBg.setFillStyle(hoverColor);
        this.highlightIndex = i;
      });
      itemBg.on('pointerout', () => {
        itemBg.setFillStyle(0x222222);
      });
      itemBg.on('pointerup', () => {
        this.selectOption(opt);
        this.close();
      });

      this.optionContainer!.add([itemBg, itemText]);
    });

    this.emit('open');
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.arrow.setText('\u25BC');
    this.highlightIndex = -1;

    if (this.optionContainer) {
      this.optionContainer.destroy(true);
      this.optionContainer = null;
    }

    this.emit('close');
  }

  get selectedValue(): string | null {
    return this._selectedValue;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  setSelected(value: string): this {
    const opt = this.dropdownConfig.options.find(o => o.value === value);
    if (opt) this.selectOption(opt);
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.close();
    if (this.pointerDownHandler) {
      this.scene?.input?.off('pointerdown', this.pointerDownHandler);
      this.pointerDownHandler = null;
    }
    if (this.keyHandler) {
      this.scene?.input?.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    super.destroy(fromScene);
  }

  private selectOption(opt: DropdownOption): void {
    this._selectedValue = opt.value;
    this.label.setText(opt.label);
    this.dropdownConfig.onChange?.(opt.value, opt.label);
    this.emit('change', opt.value, opt.label);
    ConsoleReporter.input(`dropdown: selected '${opt.label}'`);
  }

  private getDisplayText(): string {
    if (this._selectedValue) {
      const opt = this.dropdownConfig.options.find(o => o.value === this._selectedValue);
      return opt?.label ?? this.dropdownConfig.placeholder ?? 'Select...';
    }
    return this.dropdownConfig.placeholder ?? 'Select...';
  }

  private updateHighlight(): void {
    // Highlight is managed via hover in the option list
    // Keyboard highlight handled by highlightIndex for Enter key
  }
}
