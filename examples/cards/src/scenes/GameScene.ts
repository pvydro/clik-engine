import {
  BaseScene, ConsoleReporter, Toast,
  LayeredTile, DepthRenderer, GraphicsParticles,
  ScorePopup, ComboDisplay, AnimatedHUD,
  GameFeelPresets, SceneUtils,
} from 'clik-engine';
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
  row: number;
  col: number;
  x: number;
  y: number;
  tile: LayeredTile;
  coverTile: LayeredTile;
  hitArea: Phaser.GameObjects.Rectangle;
}

export class GameScene extends BaseScene {
  private cards: Card[] = [];
  private firstCard: Card | null = null;
  private secondCard: Card | null = null;
  private lockInput = false;
  private matches = 0;
  private moves = 0;
  private totalPairs = 0;
  private hud!: AnimatedHUD;
  private particles!: GraphicsParticles;
  private comboDisplay!: ComboDisplay;
  private combo = 0;
  private cols = 4;
  private rows = 4;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a0f');

    // Systems
    this.particles = new GraphicsParticles(this);
    this.comboDisplay = new ComboDisplay(this, { particles: this.particles });

    // Title
    this.add.text(width / 2, 35, 'Card Match', {
      fontSize: '32px', fontFamily: 'monospace', color: '#88c0d0', fontStyle: 'bold',
    }).setOrigin(0.5);

    // HUD
    this.hud = new AnimatedHUD(this);
    this.hud.addCounter('moves', { label: 'MOVES', x: width / 2 - 60, y: 80, color: 0x88c0d0 });
    this.hud.addCounter('pairs', { label: 'PAIRS', x: width / 2 + 60, y: 80, color: 0xa3be8c });

    // Generate pairs
    this.totalPairs = (this.cols * this.rows) / 2;
    const symbols = SYMBOLS.slice(0, this.totalPairs);
    const deck = [...symbols, ...symbols];

    // Shuffle (Fisher-Yates)
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
    const gridX = (width - gridW) / 2;
    const gridY = 120;

    // Grid background with depth
    const gridGfx = this.add.graphics();
    DepthRenderer.drawGrid(gridGfx, gridX - 10, gridY - 10, this.cols, cardW, {
      rows: this.rows,
      padding: 10,
      cellPadding: gap,
      panelConfig: {
        fillColor: 0x0a0a0f,
        cornerRadius: 14,
        shadow: { offsetX: 3, offsetY: 4, alpha: 0.3 },
        glow: { color: 0x88c0d0, alpha: 0.06 },
        highlight: { alpha: 0.02, height: 0.25 },
      },
      cellConfig: {
        fillColor: 0x12121f,
        cornerRadius: 10,
        shadow: { offsetX: 1, offsetY: 1, alpha: 0.25 },
        highlight: { alpha: 0.02, height: 0.3 },
      },
    });

    // Create cards
    this.cards = [];
    for (let i = 0; i < deck.length; i++) {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const x = gridX + col * (cardW + gap) + cardW / 2;
      const y = gridY + row * (cardH + gap) + cardH / 2;

      // LayeredTile as the card face (hidden initially)
      const symbolColor = COLORS[deck[i]] ?? 0x888888;
      const tile = new LayeredTile(this, {
        size: Math.min(cardW, cardH) - 8,
        color: symbolColor,
        cornerRadius: 10,
        label: deck[i],
        labelStyle: { fontSize: '36px' },
        shadow: { offsetX: 2, offsetY: 3, alpha: 0.2 },
        glow: { expand: 6, alpha: 0.04 },
        highlight: { alpha: 0.05, height: 0.35 },
        border: { width: 2, alpha: 0.6 },
      });
      tile.setPosition(x, y);
      tile.setDepth(5);
      tile.setVisible(false);

      // Cover tile (face-down state) — rich layered card back
      const coverTile = new LayeredTile(this, {
        size: Math.min(cardW, cardH) - 8,
        color: 0x5e81ac,
        cornerRadius: 10,
        shape: { type: 'polygon', sides: 6, radius: 14 },
        shadow: { offsetX: 2, offsetY: 3, alpha: 0.3 },
        glow: { expand: 6, alpha: 0.05 },
        highlight: { alpha: 0.08, height: 0.4 },
        border: { width: 2, alpha: 0.7 },
      });
      coverTile.setPosition(x, y);
      coverTile.setDepth(10);

      // Invisible hit area for interaction
      const hitArea = this.add.rectangle(x, y, cardW - 4, cardH - 4, 0x000000, 0)
        .setOrigin(0.5).setDepth(15).setInteractive({ useHandCursor: true });

      const card: Card = { symbol: deck[i], revealed: false, matched: false, row, col, x, y, tile, coverTile, hitArea };

      hitArea.on('pointerup', () => this.onCardClick(card));
      hitArea.on('pointerover', () => { if (!card.revealed) coverTile.redraw({ color: 0x81a1c1 }); });
      hitArea.on('pointerout', () => { if (!card.revealed) coverTile.redraw({ color: 0x5e81ac }); });

      this.cards.push(card);
    }

    // New game button
    this.add.text(width / 2, height - 35, 'New Game', {
      fontSize: '14px', fontFamily: 'monospace', color: '#00ff88',
      backgroundColor: '#1a1a2e', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.audio.procedural.click();
        this.scene.restart();
      });

    // Start music
    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.1);

    this.inspectState('cards', () => ({
      moves: this.moves,
      matches: this.matches,
      total: this.totalPairs,
      remaining: this.totalPairs - this.matches,
      combo: this.combo,
    }));

    ConsoleReporter.scene('Card Match ready');
  }

  private onCardClick(card: Card): void {
    if (this.lockInput || card.revealed || card.matched) return;

    this.revealCard(card);
    this.audio.procedural.click();

    if (!this.firstCard) {
      this.firstCard = card;
    } else if (!this.secondCard) {
      this.secondCard = card;
      this.moves++;
      this.hud.updateCounter('moves', this.moves);

      if (this.firstCard.symbol === this.secondCard.symbol) {
        // Match!
        this.combo++;
        this.firstCard.matched = true;
        this.secondCard.matched = true;
        this.matches++;

        const symbolColor = COLORS[card.symbol] ?? 0x888888;

        // Match feedback on both cards
        for (const c of [this.firstCard, this.secondCard]) {
          GameFeelPresets.mergeSquash(this, c.tile, { intensity: 0.7 });
          this.particles.sparkle(c.x, c.y, symbolColor);
          c.tile.breathing();
          c.tile.glowPulse();
        }

        // Score popup between the two cards
        const midX = (this.firstCard.x + this.secondCard.x) / 2;
        const midY = (this.firstCard.y + this.secondCard.y) / 2;
        ScorePopup.feedback(this, midX, midY, 'MATCH!', { color: symbolColor });

        // Audio
        this.audio.procedural.merge(1);
        this.audio.procedural.shimmer();

        // Combo effects
        if (this.combo >= 2) {
          this.comboDisplay.show(this.combo, { color: symbolColor });
          SceneUtils.comboShake(this, this.combo);
          this.audio.procedural.comboPopup(this.combo);
        }

        this.hud.updateCounter('pairs', this.matches);

        // Update music intensity
        this.audio.proceduralMusic.setIntensity(Math.min(1, this.matches / this.totalPairs));

        ConsoleReporter.state(`match: ${card.symbol}, ${this.matches}/${this.totalPairs}`);

        // Check win
        if (this.matches === this.totalPairs) {
          this.time.delayedCall(400, () => this.onWin());
        }

        this.firstCard = null;
        this.secondCard = null;
      } else {
        // No match — flash red and flip back
        this.combo = 0;
        this.lockInput = true;

        // Mismatch audio
        this.audio.procedural.tone({ frequency: 200, type: 'sine', duration: 0.15, volume: 0.15 });

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
    card.tile.setVisible(true);
    card.coverTile.setVisible(false);

    // Scale-in reveal animation
    card.tile.setScale(0.8);
    GameFeelPresets.spawnIn(this, card.tile, { duration: 150 });
  }

  private hideCard(card: Card): void {
    card.revealed = false;
    card.tile.setVisible(false);
    card.coverTile.setVisible(true);
    card.coverTile.redraw({ color: 0x5e81ac });
  }

  private onWin(): void {
    const { width, height } = this.scale;

    // Celebration
    this.particles.celebrate(width / 2, height / 2, 0xffcc00, { count: 30 });
    SceneUtils.screenFlash(this, 0xffffff, 300);
    this.audio.procedural.victory();
    this.audio.proceduralMusic.stop(500);

    // Show win with best score
    const saved = this.save.load(0);
    const bestMoves = saved?.bestMoves as number | undefined;
    const isNewBest = !bestMoves || this.moves < bestMoves;

    if (isNewBest) {
      this.save.save(0, { bestMoves: this.moves });
    }

    const msg = isNewBest
      ? `New best! ${this.moves} moves!`
      : `Won in ${this.moves} moves! (Best: ${bestMoves})`;

    Toast.show(this, { message: msg, position: 'center', duration: 4000 });
    ConsoleReporter.state('game won', { moves: this.moves });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
