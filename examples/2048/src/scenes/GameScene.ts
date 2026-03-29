import {
  BaseScene, ConsoleReporter, Toast,
  LayeredTile, DepthRenderer, GameFeelPresets, GraphicsParticles,
  ScorePopup, ComboDisplay, AnimatedHUD, SceneUtils,
} from 'clik-engine';
import Phaser from 'phaser';

const SIZE = 4;
const CELL = 110;
const GAP = 10;
const CELL_PAD = 5;
const GRID_PAD = 8;

// Tier colors: value → neon cyberpunk color
const TIER_COLORS: Record<number, number> = {
  2: 0x00fff0,      // cyan
  4: 0x00ff88,      // green
  8: 0xffff00,      // yellow
  16: 0xff8800,     // orange
  32: 0xff0044,     // red
  64: 0xff00ff,     // magenta
  128: 0x8800ff,    // purple
  256: 0x0088ff,    // blue
  512: 0xffffff,    // white
  1024: 0xffcc00,   // gold
  2048: 0xff44ff,   // bright magenta
};

function getTierColor(value: number): number {
  return TIER_COLORS[value] ?? 0xb48ead;
}

function getTier(value: number): number {
  return Math.max(1, Math.round(Math.log2(value)));
}

export class GameScene extends BaseScene {
  private grid: number[][] = [];
  private tileMap: (LayeredTile | null)[][] = [];
  private score = 0;
  private best = 0;
  private hud!: AnimatedHUD;
  private particles!: GraphicsParticles;
  private comboDisplay!: ComboDisplay;
  private moving = false;
  private gridX = 0;
  private gridY = 0;
  private combo = 0;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a0f');

    // Load best score
    const saved = this.save.load(0);
    if (saved) this.best = (saved.best as number) ?? 0;

    // Layout
    const cellTotal = CELL + CELL_PAD;
    const gridSize = SIZE * CELL + (SIZE - 1) * CELL_PAD + GRID_PAD * 2;
    this.gridX = (width - gridSize) / 2;
    this.gridY = 200;

    // Title
    this.add.text(width / 2, 40, '2048', {
      fontSize: '48px', fontFamily: 'monospace', color: '#e0e0e0', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Systems
    this.particles = new GraphicsParticles(this);
    this.comboDisplay = new ComboDisplay(this, { particles: this.particles });

    // HUD
    this.hud = new AnimatedHUD(this);
    this.hud.addCounter('score', { label: 'SCORE', x: width / 2 - 80, y: 110, color: 0x00fff0 });
    this.hud.addCounter('best', { label: 'BEST', x: width / 2 + 80, y: 110, color: 0x00ff88 });
    this.hud.updateCounter('best', this.best);

    // Grid background with depth
    const gridGfx = this.add.graphics();
    DepthRenderer.drawGrid(gridGfx, this.gridX, this.gridY, SIZE, CELL, {
      padding: GRID_PAD,
      cellPadding: CELL_PAD,
      panelConfig: {
        fillColor: 0x0a0a0f,
        shadow: { offsetX: 3, offsetY: 4, alpha: 0.3 },
        glow: { color: 0x00fff0, alpha: 0.08 },
        highlight: { alpha: 0.02, height: 0.3 },
      },
      cellConfig: {
        fillColor: 0x12121f,
        shadow: { offsetX: 1, offsetY: 1, alpha: 0.3 },
        highlight: { alpha: 0.02, height: 0.35 },
      },
    });

    // Init grid arrays
    this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.tileMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

    // Spawn initial tiles
    this.spawnTile();
    this.spawnTile();

    // New game button
    const btnY = this.gridY + gridSize + 40;
    this.add.text(width / 2, btnY, 'New Game', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
      backgroundColor: '#1a1a2e', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.audio.procedural.click();
        this.newGame();
      });

    this.add.text(width / 2, height - 30, 'Arrow keys or swipe', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0.5);

    this.inspectState('2048', () => ({
      score: this.score,
      best: this.best,
      maxTile: Math.max(...this.grid.flat()),
      empty: this.grid.flat().filter(v => v === 0).length,
      combo: this.combo,
    }));

    // Start procedural music
    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.2);

    ConsoleReporter.scene('2048 ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.moving) return;

    let dir: 'left' | 'right' | 'up' | 'down' | null = null;
    if (this.actions.justPressed('left')) dir = 'left';
    else if (this.actions.justPressed('right')) dir = 'right';
    else if (this.actions.justPressed('up')) dir = 'up';
    else if (this.actions.justPressed('down')) dir = 'down';

    if (dir) {
      this.handleMove(dir);
    }
  }

  private async handleMove(dir: 'left' | 'right' | 'up' | 'down'): Promise<void> {
    const result = this.computeMove(dir);
    if (!result.moved) return;

    this.moving = true;
    this.combo = 0;
    this.audio.procedural.slide();

    // Animate all tile slides
    const slidePromises: Promise<void>[] = [];
    for (const move of result.moves) {
      const tile = this.tileMap[move.fromR][move.fromC];
      if (!tile) continue;

      // Move tile reference in the map
      this.tileMap[move.fromR][move.fromC] = null;

      const { x, y } = this.cellPos(move.toR, move.toC);
      slidePromises.push(GameFeelPresets.slideTo(this, tile, x, y));

      if (move.merge) {
        // This tile will be absorbed — mark for destruction after slide
      } else {
        this.tileMap[move.toR][move.toC] = tile;
      }
    }

    await Promise.all(slidePromises);

    // Process merges
    for (const merge of result.merges) {
      this.combo++;
      const mergedValue = merge.value;
      this.score += mergedValue;

      // Destroy the absorbed tile
      if (merge.absorbedTile) {
        merge.absorbedTile.destroy();
      }

      // Update the surviving tile
      const survivingTile = this.tileMap[merge.r][merge.c];
      if (survivingTile) {
        const color = getTierColor(mergedValue);
        const tier = getTier(mergedValue);
        survivingTile.setTier(color, String(mergedValue));

        // Merge animation + particles + score popup
        const { x, y } = this.cellPos(merge.r, merge.c);

        GameFeelPresets.mergeSquash(this, survivingTile);
        this.particles.impact(x, y, color, this.combo);
        ScorePopup.score(this, x, y - CELL / 2, mergedValue, this.combo);

        // Audio
        this.audio.procedural.merge(tier);
        if (this.combo > 1) {
          this.audio.procedural.chain(this.combo);
        }

        // Combo display
        if (this.combo >= 2) {
          this.comboDisplay.show(this.combo, { color });
          SceneUtils.comboShake(this, this.combo);
        }

        // High-value tile breathing
        if (mergedValue >= 256) {
          survivingTile.stopAnimations();
          survivingTile.breathing();
          survivingTile.glowPulse();
        }
      }
    }

    // Apply merged grid state
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        this.grid[r][c] = result.newGrid[r][c];
      }
    }

    // Update score
    if (this.score > 0) {
      this.hud.updateCounter('score', this.score);
    }
    if (this.score > this.best) {
      this.best = this.score;
      this.save.save(0, { best: this.best });
      this.hud.updateCounter('best', this.best);
    }

    // Update music intensity based on max tile
    const maxTile = Math.max(...this.grid.flat());
    const intensity = Math.min(1, getTier(Math.max(maxTile, 2)) / 11);
    this.audio.proceduralMusic.setIntensity(intensity);

    // Spawn new tile
    this.spawnTile();

    // Check game over
    if (this.isGameOver()) {
      this.audio.proceduralMusic.stop(1000);
      this.audio.procedural.gameOver();
      Toast.show(this, { message: `Game Over! Score: ${this.score}`, position: 'center', duration: 3000 });
      ConsoleReporter.state('game over', { score: this.score });
    }

    this.moving = false;
    ConsoleReporter.state(`move: ${dir}, score: ${this.score}`);
  }

  private cellPos(r: number, c: number): { x: number; y: number } {
    return {
      x: this.gridX + GRID_PAD + c * (CELL + CELL_PAD) + CELL / 2,
      y: this.gridY + GRID_PAD + r * (CELL + CELL_PAD) + CELL / 2,
    };
  }

  private computeMove(dir: 'left' | 'right' | 'up' | 'down'): {
    moved: boolean;
    newGrid: number[][];
    moves: { fromR: number; fromC: number; toR: number; toC: number; merge: boolean }[];
    merges: { r: number; c: number; value: number; absorbedTile: LayeredTile | null }[];
  } {
    const newGrid = this.grid.map(row => [...row]);
    const merged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const moves: { fromR: number; fromC: number; toR: number; toC: number; merge: boolean }[] = [];
    const merges: { r: number; c: number; value: number; absorbedTile: LayeredTile | null }[] = [];
    let moved = false;

    const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

    const iterate = (callback: (r: number, c: number) => void) => {
      if (dir === 'right' || dir === 'down') {
        for (let r = SIZE - 1; r >= 0; r--) for (let c = SIZE - 1; c >= 0; c--) callback(r, c);
      } else {
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) callback(r, c);
      }
    };

    iterate((r, c) => {
      if (newGrid[r][c] === 0) return;

      let nr = r + dr;
      let nc = c + dc;

      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && newGrid[nr][nc] === 0) {
        nr += dr;
        nc += dc;
      }

      // Check merge
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
          newGrid[nr][nc] === newGrid[r][c] && !merged[nr][nc]) {
        const mergedValue = newGrid[r][c] * 2;
        newGrid[nr][nc] = mergedValue;
        newGrid[r][c] = 0;
        merged[nr][nc] = true;
        moved = true;

        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, merge: true });
        merges.push({ r: nr, c: nc, value: mergedValue, absorbedTile: this.tileMap[r][c] });
      } else {
        // Move to last empty
        nr -= dr;
        nc -= dc;
        if (nr !== r || nc !== c) {
          newGrid[nr][nc] = newGrid[r][c];
          newGrid[r][c] = 0;
          moved = true;
          moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, merge: false });
        }
      }
    });

    return { moved, newGrid, moves, merges };
  }

  private spawnTile(): void {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return;

    const pos = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    this.grid[pos.r][pos.c] = value;

    const { x, y } = this.cellPos(pos.r, pos.c);
    const color = getTierColor(value);

    const tile = new LayeredTile(this, {
      size: CELL - 4,
      color,
      cornerRadius: 10,
      label: String(value),
      labelStyle: { fontSize: `${value >= 1024 ? 22 : value >= 128 ? 26 : 30}px` },
      shadow: { offsetX: 2, offsetY: 3, alpha: 0.25 },
      glow: { expand: 8, alpha: 0.06 },
      highlight: { alpha: 0.06, height: 0.4 },
      border: { width: 2, alpha: 0.8 },
    });
    tile.setPosition(x, y);
    tile.setDepth(10);

    this.tileMap[pos.r][pos.c] = tile;

    // Spawn animation
    GameFeelPresets.spawnIn(this, tile);
    this.particles.sparkle(x, y, color);
    this.audio.procedural.spawn();
  }

  private isGameOver(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.grid[r][c] === 0) return false;
        if (c < SIZE - 1 && this.grid[r][c] === this.grid[r][c + 1]) return false;
        if (r < SIZE - 1 && this.grid[r][c] === this.grid[r + 1][c]) return false;
      }
    }
    return true;
  }

  private newGame(): void {
    // Destroy all tiles
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        this.tileMap[r][c]?.destroy();
        this.tileMap[r][c] = null;
      }
    }

    this.score = 0;
    this.combo = 0;
    this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.tileMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

    this.hud.updateCounter('score', 0);

    this.spawnTile();
    this.spawnTile();

    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.2);

    ConsoleReporter.state('new game started');
  }
}
