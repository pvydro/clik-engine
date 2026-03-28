import { BaseScene, ConsoleReporter, Toast } from 'clik-engine';
import Phaser from 'phaser';

const SIZE = 4;
const CELL = 110;
const GAP = 10;

const TILE_COLORS: Record<number, number> = {
  2: 0x3d5a80, 4: 0x4a6fa5, 8: 0x5e81ac, 16: 0x7b9ec7,
  32: 0xbf616a, 64: 0xd08770, 128: 0xebcb8b, 256: 0xa3be8c,
  512: 0x88c0d0, 1024: 0x5e81ac, 2048: 0xb48ead,
};

export class GameScene extends BaseScene {
  private grid: number[][] = [];
  private tiles: (Phaser.GameObjects.Rectangle | null)[][] = [];
  private labels: (Phaser.GameObjects.Text | null)[][] = [];
  private score = 0;
  private best = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private moving = false;
  private gridX = 0;
  private gridY = 0;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d1117');

    // Load best score
    const saved = this.save.load(0);
    if (saved) this.best = (saved.best as number) ?? 0;

    // Layout
    const gridSize = SIZE * CELL + (SIZE + 1) * GAP;
    this.gridX = (width - gridSize) / 2;
    this.gridY = 200;

    // Title
    this.add.text(width / 2, 40, '2048', {
      fontSize: '48px', fontFamily: 'monospace', color: '#e0e0e0', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Scores
    this.scoreText = this.add.text(width / 2 - 80, 100, 'Score: 0', {
      fontSize: '18px', fontFamily: 'monospace', color: '#88c0d0',
    }).setOrigin(0.5);

    this.bestText = this.add.text(width / 2 + 80, 100, `Best: ${this.best}`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#a3be8c',
    }).setOrigin(0.5);

    // Grid background
    this.add.rectangle(this.gridX + gridSize / 2, this.gridY + gridSize / 2, gridSize, gridSize, 0x1a1a2e, 1)
      .setOrigin(0.5);

    // Init grid
    this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.tiles = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    this.labels = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

    // Draw empty cells
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const { x, y } = this.cellPos(r, c);
        this.add.rectangle(x, y, CELL, CELL, 0x222244).setOrigin(0.5);
      }
    }

    this.spawnTile();
    this.spawnTile();
    this.renderGrid();

    // New game button
    this.add.text(width / 2, this.gridY + gridSize + 40, 'New Game', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
      backgroundColor: '#333355', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.newGame());

    this.add.text(width / 2, height - 30, 'Arrow keys or swipe', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0.5);

    this.inspectState('2048', () => ({
      score: this.score,
      best: this.best,
      maxTile: Math.max(...this.grid.flat()),
      empty: this.grid.flat().filter(v => v === 0).length,
    }));

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
      const moved = this.move(dir);
      if (moved) {
        this.spawnTile();
        this.renderGrid();
        if (this.isGameOver()) {
          Toast.show(this, { message: `Game Over! Score: ${this.score}`, position: 'center', duration: 3000 });
          ConsoleReporter.state('game over', { score: this.score });
        }
      }
    }
  }

  private cellPos(r: number, c: number): { x: number; y: number } {
    return {
      x: this.gridX + GAP + c * (CELL + GAP) + CELL / 2,
      y: this.gridY + GAP + r * (CELL + GAP) + CELL / 2,
    };
  }

  private move(dir: 'left' | 'right' | 'up' | 'down'): boolean {
    let moved = false;
    const merged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

    const iterate = (callback: (r: number, c: number) => void) => {
      if (dir === 'right' || dir === 'down') {
        for (let r = SIZE - 1; r >= 0; r--) for (let c = SIZE - 1; c >= 0; c--) callback(r, c);
      } else {
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) callback(r, c);
      }
    };

    const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

    iterate((r, c) => {
      if (this.grid[r][c] === 0) return;

      let nr = r + dr;
      let nc = c + dc;

      while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && this.grid[nr][nc] === 0) {
        nr += dr;
        nc += dc;
      }

      // Check merge
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
          this.grid[nr][nc] === this.grid[r][c] && !merged[nr][nc]) {
        this.grid[nr][nc] *= 2;
        this.score += this.grid[nr][nc];
        this.grid[r][c] = 0;
        merged[nr][nc] = true;
        moved = true;
      } else {
        // Move to last empty
        nr -= dr;
        nc -= dc;
        if (nr !== r || nc !== c) {
          this.grid[nr][nc] = this.grid[r][c];
          this.grid[r][c] = 0;
          moved = true;
        }
      }
    });

    if (moved) {
      if (this.score > this.best) {
        this.best = this.score;
        this.save.save(0, { best: this.best });
      }
      this.scoreText.setText(`Score: ${this.score}`);
      this.bestText.setText(`Best: ${this.best}`);
      ConsoleReporter.state(`move: ${dir}, score: ${this.score}`);
    }

    return moved;
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
    this.grid[pos.r][pos.c] = Math.random() < 0.9 ? 2 : 4;
  }

  private renderGrid(): void {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        // Destroy old
        this.tiles[r][c]?.destroy();
        this.labels[r][c]?.destroy();
        this.tiles[r][c] = null;
        this.labels[r][c] = null;

        const val = this.grid[r][c];
        if (val === 0) continue;

        const { x, y } = this.cellPos(r, c);
        const color = TILE_COLORS[val] ?? 0xb48ead;
        this.tiles[r][c] = this.add.rectangle(x, y, CELL - 4, CELL - 4, color).setOrigin(0.5);

        const fontSize = val >= 1024 ? '22px' : val >= 128 ? '26px' : '30px';
        this.labels[r][c] = this.add.text(x, y, String(val), {
          fontSize, fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
      }
    }
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
    this.score = 0;
    this.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    this.spawnTile();
    this.spawnTile();
    this.renderGrid();
    this.scoreText.setText('Score: 0');
    ConsoleReporter.state('new game started');
  }
}
