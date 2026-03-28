import { BaseScene, ConsoleReporter, Toast } from 'clik-engine';
import Phaser from 'phaser';

const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLORS: Record<string, number> = {
  A: 0xbf616a, B: 0xd08770, C: 0xebcb8b, D: 0xa3be8c,
  E: 0x88c0d0, F: 0x5e81ac, G: 0xb48ead, H: 0x8fbcbb,
};

interface Card {
  symbol: string;
  revealed: boolean;
  matched: boolean;
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  cover: Phaser.GameObjects.Rectangle;
}

export class GameScene extends BaseScene {
  private cards: Card[] = [];
  private firstCard: Card | null = null;
  private secondCard: Card | null = null;
  private lockInput = false;
  private matches = 0;
  private moves = 0;
  private totalPairs = 0;
  private movesText!: Phaser.GameObjects.Text;
  private cols = 4;
  private rows = 4;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d1117');

    this.add.text(width / 2, 40, 'Card Match', {
      fontSize: '32px', fontFamily: 'monospace', color: '#88c0d0', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.movesText = this.add.text(width / 2, 80, 'Moves: 0', {
      fontSize: '16px', fontFamily: 'monospace', color: '#666',
    }).setOrigin(0.5);

    // Generate pairs
    this.totalPairs = (this.cols * this.rows) / 2;
    const symbols = SYMBOLS.slice(0, this.totalPairs);
    const deck = [...symbols, ...symbols];

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Layout
    const cardW = 100;
    const cardH = 120;
    const gap = 12;
    const gridW = this.cols * cardW + (this.cols - 1) * gap;
    const gridH = this.rows * cardH + (this.rows - 1) * gap;
    const startX = (width - gridW) / 2 + cardW / 2;
    const startY = 130 + cardH / 2;

    this.cards = [];
    for (let i = 0; i < deck.length; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const bg = this.add.rectangle(x, y, cardW, cardH, 0x1a1a2e).setOrigin(0.5);
      const text = this.add.text(x, y, deck[i], {
        fontSize: '36px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);

      const cover = this.add.rectangle(x, y, cardW, cardH, 0x2e3440)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });

      const card: Card = { symbol: deck[i], revealed: false, matched: false, bg, text, cover };

      cover.on('pointerup', () => this.onCardClick(card));
      cover.on('pointerover', () => { if (!card.revealed) cover.setFillStyle(0x3b4252); });
      cover.on('pointerout', () => { if (!card.revealed) cover.setFillStyle(0x2e3440); });

      this.cards.push(card);
    }

    // New game button
    this.add.text(width / 2, height - 40, 'New Game', {
      fontSize: '14px', fontFamily: 'monospace', color: '#00ff88',
      backgroundColor: '#333355', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.restart());

    this.inspectState('cards', () => ({
      moves: this.moves,
      matches: this.matches,
      total: this.totalPairs,
      remaining: this.totalPairs - this.matches,
    }));

    ConsoleReporter.scene('Card Match ready');
  }

  private onCardClick(card: Card): void {
    if (this.lockInput || card.revealed || card.matched) return;

    this.revealCard(card);

    if (!this.firstCard) {
      this.firstCard = card;
    } else if (!this.secondCard) {
      this.secondCard = card;
      this.moves++;
      this.movesText.setText(`Moves: ${this.moves}`);

      if (this.firstCard.symbol === this.secondCard.symbol) {
        // Match!
        this.firstCard.matched = true;
        this.secondCard.matched = true;
        this.firstCard.bg.setFillStyle(COLORS[card.symbol] ?? 0x333333);
        this.secondCard.bg.setFillStyle(COLORS[card.symbol] ?? 0x333333);
        this.matches++;
        this.firstCard = null;
        this.secondCard = null;
        ConsoleReporter.state(`match: ${card.symbol}, ${this.matches}/${this.totalPairs}`);

        if (this.matches === this.totalPairs) {
          Toast.show(this, {
            message: `You won in ${this.moves} moves!`,
            position: 'center',
            duration: 4000,
          });
          this.save.save(0, { bestMoves: this.moves });
          ConsoleReporter.state('game won', { moves: this.moves });
        }
      } else {
        // No match — flip back after delay
        this.lockInput = true;
        this.time.delayedCall(800, () => {
          this.hideCard(this.firstCard!);
          this.hideCard(this.secondCard!);
          this.firstCard = null;
          this.secondCard = null;
          this.lockInput = false;
        });
      }
    }
  }

  private revealCard(card: Card): void {
    card.revealed = true;
    card.text.setVisible(true);
    card.cover.setVisible(false);

    // Pop animation
    this.tweens.add({
      targets: [card.bg, card.text],
      scaleX: 1.05, scaleY: 1.05,
      duration: 100,
      yoyo: true,
    });
  }

  private hideCard(card: Card): void {
    card.revealed = false;
    card.text.setVisible(false);
    card.cover.setVisible(true);
    card.cover.setFillStyle(0x2e3440);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
