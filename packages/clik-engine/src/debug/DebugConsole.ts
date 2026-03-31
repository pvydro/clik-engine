import Phaser from 'phaser';
import { ConsoleReporter } from './ConsoleReporter';
import { registerBuiltinCommands } from './DebugConsoleCommands';
import type { BaseScene } from '../scenes/BaseScene';

/** A registered console command. */
export interface ConsoleCommand {
  /** Handler receives the argument string and a log function. */
  handler: (args: string, log: ConsolePrinter) => void;
  /** Short description shown in `help`. */
  description: string;
}

export interface ConsolePrinter {
  log(text: string, color?: string): void;
  warn(text: string): void;
  error(text: string): void;
}

const SCENE_KEY = '__clik_debug_console';
const MAX_OUTPUT_LINES = 200;
const PANEL_ALPHA = 0.88;
const FONT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '13px',
  fontFamily: 'monospace',
  color: '#cccccc',
  wordWrap: { useAdvancedWrap: true },
};

/**
 * In-game debug console (Quake-style). Toggle with backtick (`` ` ``).
 *
 * Automatically started when `debug: true` in ClikGameConfig.
 * Access programmatically via `window.__CLIK_CONSOLE`.
 */
export class DebugConsole extends Phaser.Scene {
  // ── Visual elements ───────────────────────────────────────────────
  private panel!: Phaser.GameObjects.Rectangle;
  private outputText!: Phaser.GameObjects.Text;
  private inputBg!: Phaser.GameObjects.Rectangle;
  private promptText!: Phaser.GameObjects.Text;
  private inputText!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Rectangle;
  private divider!: Phaser.GameObjects.Rectangle;

  // ── State ─────────────────────────────────────────────────────────
  private open = false;
  private inputValue = '';
  private outputLines: { text: string; color: string }[] = [];
  private scrollOffset = 0;
  private history: string[] = [];
  private historyIndex = -1;
  private commands = new Map<string, ConsoleCommand>();
  private cursorVisible = true;
  private cursorTimer?: Phaser.Time.TimerEvent;
  private toggleKey: Phaser.Input.Keyboard.Key | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private updateCounter = 0;

  // ── Layout constants (computed in create) ─────────────────────────
  private panelH = 0;
  private panelY = 0;
  private outputY = 0;
  private outputH = 0;
  private inputY = 0;
  private panelW = 0;
  private padX = 10;

  constructor() {
    super({ key: SCENE_KEY });
  }

  // ── Phaser lifecycle ──────────────────────────────────────────────

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.panelW = w;
    this.panelH = Math.floor(h * 0.42);
    this.panelY = h - this.panelH;
    this.inputY = h - 28;
    this.outputY = this.panelY + 6;
    this.outputH = this.panelH - 36;

    // Semi-transparent background
    this.panel = this.add.rectangle(w / 2, this.panelY + this.panelH / 2, w, this.panelH, 0x111118, PANEL_ALPHA)
      .setDepth(100000).setScrollFactor(0).setVisible(false);

    // Divider between output and input
    this.divider = this.add.rectangle(w / 2, this.inputY - 6, w - 16, 1, 0x444466, 0.6)
      .setDepth(100001).setScrollFactor(0).setVisible(false);

    // Output area
    this.outputText = this.add.text(this.padX, this.outputY, '', {
      ...FONT,
      wordWrap: { width: w - this.padX * 2, useAdvancedWrap: true },
    }).setDepth(100001).setScrollFactor(0).setVisible(false);

    // Input line background
    this.inputBg = this.add.rectangle(w / 2, this.inputY + 4, w, 24, 0x0a0a12, 0.9)
      .setDepth(100001).setScrollFactor(0).setVisible(false);

    // Prompt ">"
    this.promptText = this.add.text(this.padX, this.inputY - 4, '>', {
      fontSize: '14px', fontFamily: 'monospace', color: '#00ff88',
    }).setDepth(100002).setScrollFactor(0).setVisible(false);

    // Input text
    this.inputText = this.add.text(this.padX + 16, this.inputY - 4, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(100002).setScrollFactor(0).setVisible(false);

    // Blinking cursor
    this.cursor = this.add.rectangle(this.padX + 16, this.inputY + 3, 8, 14, 0x00ff88, 0.8)
      .setDepth(100002).setScrollFactor(0).setVisible(false).setOrigin(0, 0.5);

    // Toggle key (backtick) — only used to detect toggle, input captured via DOM
    if (this.input.keyboard) {
      this.toggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK);
    }

    // Mouse wheel scroll when open
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (!this.open) return;
      this.scrollOffset = Math.max(0, Math.min(
        this.scrollOffset + (dy > 0 ? 3 : -3),
        Math.max(0, this.outputLines.length - this.visibleLineCount()),
      ));
      this.renderOutput();
    });

    // Register built-in commands
    registerBuiltinCommands(this, this.game);

    this.log('CLIK Debug Console — type "help" for commands', '#888888');
  }

  update(): void {
    // Check toggle key
    if (this.toggleKey?.isDown && this.updateCounter > 10) {
      this.toggle();
      this.updateCounter = 0;
    }
    this.updateCounter++;
  }

  // ── Public API ────────────────────────────────────────────────────

  toggle(): void {
    if (this.open) this.hide(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.setVisibility(true);
    this.attachKeyboard();
    this.startCursorBlink();
    this.renderOutput();
    ConsoleReporter.console('Console opened');
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.setVisibility(false);
    this.detachKeyboard();
    this.stopCursorBlink();
    ConsoleReporter.console('Console closed');
  }

  isOpen(): boolean {
    return this.open;
  }

  /** Execute a command string as if typed into the console. */
  exec(input: string): void {
    const trimmed = input.trim();
    if (!trimmed) return;

    this.log(`> ${trimmed}`, '#00ff88');

    const [cmd, ...rest] = trimmed.split(/\s+/);
    const args = rest.join(' ');
    const command = this.commands.get(cmd.toLowerCase());

    if (command) {
      try {
        const printer: ConsolePrinter = {
          log: (text, color) => this.log(text, color),
          warn: (text) => this.warn(text),
          error: (text) => this.error(text),
        };
        command.handler(args, printer);
      } catch (err) {
        this.error(`Command error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      this.error(`Unknown command: ${cmd}. Type "help" for available commands.`);
    }
  }

  /** Add a line to the console output. */
  log(text: string, color?: string): void {
    this.addOutput(text, color ?? '#cccccc');
  }

  warn(text: string): void {
    this.addOutput(text, '#ffcc00');
  }

  error(text: string): void {
    this.addOutput(text, '#ff4444');
  }

  clear(): void {
    this.outputLines = [];
    this.scrollOffset = 0;
    this.renderOutput();
  }

  /** Register a custom command. */
  register(name: string, handler: ConsoleCommand['handler'], description: string): void {
    this.commands.set(name.toLowerCase(), { handler, description });
  }

  /** Unregister a command. */
  unregister(name: string): void {
    this.commands.delete(name.toLowerCase());
  }

  /** Get all registered commands. */
  getCommands(): Map<string, ConsoleCommand> {
    return this.commands;
  }

  /** Returns the first active non-debug scene (the "game" scene). */
  getActiveGameScene(): BaseScene | null {
    const scenes = this.game.scene.getScenes(true);
    for (const s of scenes) {
      if (!s.scene.key.startsWith('__clik_')) {
        return s as BaseScene;
      }
    }
    return null;
  }

  // ── Keyboard handling ─────────────────────────────────────────────

  private attachKeyboard(): void {
    if (this.keyDownHandler) return;
    this.keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
    window.addEventListener('keydown', this.keyDownHandler, { capture: true });
  }

  private detachKeyboard(): void {
    if (!this.keyDownHandler) return;
    window.removeEventListener('keydown', this.keyDownHandler, { capture: true });
    this.keyDownHandler = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Allow backtick to toggle (close)
    if (e.key === '`') {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // Capture everything while open
    e.stopPropagation();
    e.preventDefault();

    switch (e.key) {
      case 'Enter':
        this.submitInput();
        break;
      case 'Backspace':
        this.inputValue = this.inputValue.slice(0, -1);
        break;
      case 'ArrowUp':
        this.historyUp();
        break;
      case 'ArrowDown':
        this.historyDown();
        break;
      case 'Escape':
        this.hide();
        return;
      case 'Tab':
        this.autocomplete();
        break;
      default:
        // Only accept printable characters
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          this.inputValue += e.key;
        }
        break;
    }

    this.updateInputDisplay();
  }

  private submitInput(): void {
    const value = this.inputValue.trim();
    if (!value) return;

    // Add to history
    if (this.history[this.history.length - 1] !== value) {
      this.history.push(value);
      if (this.history.length > 50) this.history.shift();
    }
    this.historyIndex = -1;

    this.exec(value);
    this.inputValue = '';
    this.updateInputDisplay();
  }

  private historyUp(): void {
    if (this.history.length === 0) return;
    if (this.historyIndex === -1) {
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    this.inputValue = this.history[this.historyIndex] ?? '';
  }

  private historyDown(): void {
    if (this.historyIndex === -1) return;
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.inputValue = this.history[this.historyIndex] ?? '';
    } else {
      this.historyIndex = -1;
      this.inputValue = '';
    }
  }

  private autocomplete(): void {
    if (!this.inputValue) return;
    const prefix = this.inputValue.toLowerCase();
    const matches = [...this.commands.keys()].filter(k => k.startsWith(prefix));
    if (matches.length === 1) {
      this.inputValue = matches[0] + ' ';
    } else if (matches.length > 1) {
      this.log(matches.join('  '), '#888888');
    }
  }

  // ── Output rendering ──────────────────────────────────────────────

  private addOutput(text: string, color: string): void {
    // Split multi-line text
    const lines = text.split('\n');
    for (const line of lines) {
      this.outputLines.push({ text: line, color });
    }

    // Trim old lines
    while (this.outputLines.length > MAX_OUTPUT_LINES) {
      this.outputLines.shift();
    }

    // Auto-scroll to bottom
    const maxScroll = Math.max(0, this.outputLines.length - this.visibleLineCount());
    this.scrollOffset = maxScroll;

    if (this.open) {
      this.renderOutput();
    }
  }

  private renderOutput(): void {
    if (!this.outputText) return;

    const visible = this.visibleLineCount();
    const start = this.scrollOffset;
    const end = Math.min(start + visible, this.outputLines.length);
    const slice = this.outputLines.slice(start, end);

    // Phaser Text doesn't support per-line colors natively, so we use a single color
    // and prefix colored lines with markers that indicate their type.
    // For simplicity, render plain text — color is conveyed through prefix conventions.
    const rendered = slice.map(l => l.text).join('\n');
    this.outputText.setText(rendered);

    // Tint based on the most recent line's color (visual hint)
    if (slice.length > 0) {
      const lastColor = slice[slice.length - 1].color;
      if (lastColor === '#ff4444') {
        this.outputText.setColor('#ff8888');
      } else if (lastColor === '#ffcc00') {
        this.outputText.setColor('#ffddaa');
      } else {
        this.outputText.setColor('#cccccc');
      }
    }
  }

  private visibleLineCount(): number {
    return Math.floor(this.outputH / 16);
  }

  private updateInputDisplay(): void {
    if (!this.inputText) return;
    this.inputText.setText(this.inputValue);
    // Move cursor to end of input
    this.cursor.setX(this.padX + 16 + this.inputText.width);
  }

  // ── Cursor blink ──────────────────────────────────────────────────

  private startCursorBlink(): void {
    this.cursorVisible = true;
    this.cursor.setVisible(true);
    this.cursorTimer = this.time.addEvent({
      delay: 530,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        if (this.open) this.cursor.setVisible(this.cursorVisible);
      },
    });
  }

  private stopCursorBlink(): void {
    if (this.cursorTimer) {
      this.cursorTimer.destroy();
      this.cursorTimer = undefined;
    }
  }

  // ── Visibility helpers ────────────────────────────────────────────

  private setVisibility(visible: boolean): void {
    this.panel.setVisible(visible);
    this.outputText.setVisible(visible);
    this.inputBg.setVisible(visible);
    this.promptText.setVisible(visible);
    this.inputText.setVisible(visible);
    this.cursor.setVisible(visible);
    this.divider.setVisible(visible);
  }

  shutdown(): void {
    this.detachKeyboard();
    this.stopCursorBlink();
  }
}
