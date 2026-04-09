import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { validatePositiveNumber, validateNonNegativeNumber } from '../utils/validation';

export interface DialogueLine {
  speaker?: string;
  text: string;
  portrait?: string;
  emotion?: string;
  choices?: { text: string; next: string }[];
  next?: string;
  /** Auto-advance after this many ms (0 = wait for input) */
  autoAdvance?: number;
  /** Callback key to trigger game events from dialogue */
  event?: string;
}

export type DialogueTree = Record<string, DialogueLine>;

export interface DialogueDisplayConfig {
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSize?: string;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: number;
  speakerColor?: string;
  typewriterSpeed?: number; // ms per character, 0 = instant
  padding?: number;
}

export class DialogueManager {
  private scene: Phaser.Scene;
  private tree: DialogueTree = {};
  private currentNodeId: string | null = null;
  private container: Phaser.GameObjects.Container | null = null;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private displayConfig: DialogueDisplayConfig;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private fullText = '';
  private charIndex = 0;
  private isTyping = false;
  private onCompleteCallback?: () => void;

  constructor(scene: Phaser.Scene, config: DialogueDisplayConfig) {
    this.scene = scene;
    this.displayConfig = config;
    validatePositiveNumber(config.width, 'width', 'DialogueManager');
    if (config.height !== undefined) validatePositiveNumber(config.height, 'height', 'DialogueManager');
    if (config.typewriterSpeed !== undefined) validateNonNegativeNumber(config.typewriterSpeed, 'typewriterSpeed', 'DialogueManager');
    if (config.padding !== undefined) validateNonNegativeNumber(config.padding, 'padding', 'DialogueManager');
  }

  load(tree: DialogueTree): this {
    this.tree = tree;
    return this;
  }

  start(nodeId: string, onComplete?: () => void): void {
    this.onCompleteCallback = onComplete;
    this.showNode(nodeId);
  }

  private showNode(nodeId: string): void {
    const node = this.tree[nodeId];
    if (!node) {
      ConsoleReporter.error(`Dialogue node '${nodeId}' not found`, 'Check that the node ID exists in your DialogueTree.');
      this.close();
      return;
    }

    this.currentNodeId = nodeId;
    this.clearDisplay();

    const cfg = this.displayConfig;
    const padding = cfg.padding ?? 16;

    // Background
    this.container = this.scene.add.container(cfg.x, cfg.y).setDepth(8500);

    const bg = this.scene.add.rectangle(0, 0, cfg.width, cfg.height ?? 150, cfg.backgroundColor ?? 0x111111, 0.95)
      .setOrigin(0);
    this.container.add(bg);

    // Speaker name
    if (node.speaker) {
      this.speakerText = this.scene.add.text(padding, padding, node.speaker, {
        fontSize: '14px',
        fontFamily: cfg.fontFamily ?? 'monospace',
        color: cfg.speakerColor ?? '#00ff88',
        fontStyle: 'bold',
      });
      this.container.add(this.speakerText);
    }

    // Body text with typewriter
    const textY = node.speaker ? padding + 24 : padding;
    this.bodyText = this.scene.add.text(padding, textY, '', {
      fontSize: cfg.fontSize ?? '14px',
      fontFamily: cfg.fontFamily ?? 'monospace',
      color: cfg.textColor ?? '#ffffff',
      wordWrap: { width: cfg.width - padding * 2 },
    });
    this.container.add(this.bodyText);

    const speed = cfg.typewriterSpeed ?? 30;
    if (speed > 0) {
      this.fullText = node.text;
      this.charIndex = 0;
      this.isTyping = true;
      this.typewriterTimer = this.scene.time.addEvent({
        delay: speed,
        loop: true,
        callback: () => {
          this.charIndex++;
          this.bodyText!.setText(this.fullText.substring(0, this.charIndex));
          if (this.charIndex >= this.fullText.length) {
            this.typewriterTimer?.destroy();
            this.isTyping = false;
            this.showChoicesOrContinue(node);
          }
        },
      });
    } else {
      this.bodyText.setText(node.text);
      this.isTyping = false;
      this.showChoicesOrContinue(node);
    }

    ConsoleReporter.state(`dialogue: ${nodeId} — ${node.speaker ?? ''}: ${node.text.substring(0, 40)}...`);
  }

  private showChoicesOrContinue(node: DialogueLine): void {
    if (node.choices && node.choices.length > 0) {
      const cfg = this.displayConfig;
      const padding = cfg.padding ?? 16;
      const startY = (cfg.height ?? 150) - padding - node.choices.length * 24;

      node.choices.forEach((choice, i) => {
        const ct = this.scene.add.text(padding, startY + i * 24, `> ${choice.text}`, {
          fontSize: '13px',
          fontFamily: cfg.fontFamily ?? 'monospace',
          color: '#aaaaaa',
        }).setInteractive({ useHandCursor: true })
          .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#00ff88'); })
          .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#aaaaaa'); })
          .on('pointerup', () => {
            ConsoleReporter.input(`dialogue choice: ${choice.text}`);
            this.showNode(choice.next);
          });

        this.container!.add(ct);
        this.choiceTexts.push(ct);
      });
    }
  }

  /** Skip typewriter animation or advance to next node */
  advance(): void {
    if (this.isTyping) {
      // Complete typewriter immediately
      this.typewriterTimer?.destroy();
      this.isTyping = false;
      this.bodyText?.setText(this.fullText);
      const node = this.tree[this.currentNodeId!];
      if (node) this.showChoicesOrContinue(node);
      return;
    }

    const node = this.tree[this.currentNodeId!];
    if (!node) return;

    // If no choices, advance to next or close
    if (!node.choices || node.choices.length === 0) {
      if (node.next) {
        this.showNode(node.next);
      } else {
        this.close();
      }
    }
  }

  close(): void {
    this.clearDisplay();
    this.currentNodeId = null;
    this.onCompleteCallback?.();
    ConsoleReporter.state('dialogue: closed');
  }

  private clearDisplay(): void {
    this.typewriterTimer?.destroy();
    this.container?.destroy();
    this.container = null;
    this.speakerText = null;
    this.bodyText = null;
    this.choiceTexts = [];
  }

  isActive(): boolean {
    return this.currentNodeId !== null;
  }

  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  /** Clean up all dialogue resources */
  destroy(): void {
    this.clearDisplay();
    this.currentNodeId = null;
    this.tree = {};
    this.onCompleteCallback = undefined;
  }
}
