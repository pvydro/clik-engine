import { BaseScene, Label, Button, Toast, ConsoleReporter } from 'clik-engine';

const GRID_SIZE = 4;
const CELL_SIZE = 120;
const CELL_GAP = 8;

export class GameScene extends BaseScene {
  private grid: number[][] = [];
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private labels: Phaser.GameObjects.Text[][] = [];
  private score = 0;
  private scoreLabel!: Label;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d1117');

    // Title
    this.add.text(width / 2, 60, '{{name}}', {
      fontSize: '28px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5);

    // Score
    this.scoreLabel = new Label(this, { x: width / 2, y: 100, text: 'Score: 0', fontSize: '18px', color: '#888888' });

    // Grid
    const gridWidth = GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP;
    const gridX = (width - gridWidth) / 2;
    const gridY = 150;

    // Initialize grid data
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

    // Create cell visuals
    this.cells = [];
    this.labels = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.cells[r] = [];
      this.labels[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = gridX + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
        const y = gridY + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

        this.cells[r][c] = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, 0x222233, 1);
        this.labels[r][c] = this.add.text(x, y, '', {
          fontSize: '24px', fontFamily: 'monospace', color: '#ffffff',
        }).setOrigin(0.5);
      }
    }

    // Place initial tiles
    this.spawnTile();
    this.spawnTile();
    this.updateVisuals();

    // Controls hint
    this.add.text(width / 2, height - 60, 'Arrow keys / WASD / Swipe to move', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555555',
    }).setOrigin(0.5);

    // New game button
    new Button(this, {
      x: width / 2, y: height - 30, text: 'New Game', width: 120, height: 32,
      fontSize: '12px',
      onClick: () => { this.scene.restart(); },
    });

    // Debug state
    this.inspectState('puzzle', () => ({
      score: this.score,
      tiles: this.grid.flat().filter(v => v > 0).length,
    }));

    ConsoleReporter.scene('Puzzle ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    let moved = false;
    if (this.actions.justPressed('left'))  moved = this.moveGrid('left');
    if (this.actions.justPressed('right')) moved = this.moveGrid('right');
    if (this.actions.justPressed('up'))    moved = this.moveGrid('up');
    if (this.actions.justPressed('down'))  moved = this.moveGrid('down');

    if (moved) {
      this.spawnTile();
      this.updateVisuals();
    }
  }

  private moveGrid(dir: string): boolean {
    // Simplified merge logic placeholder — real game would implement full 2048 logic
    let moved = false;
    // This is a template starter — implement your puzzle logic here!
    ConsoleReporter.state(`move: ${dir}`);
    return moved;
  }

  private spawnTile(): void {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return;

    const pos = empty[Math.floor(Math.random() * empty.length)];
    this.grid[pos.r][pos.c] = Math.random() < 0.9 ? 2 : 4;
  }

  private updateVisuals(): void {
    const colors: Record<number, number> = {
      0: 0x222233, 2: 0x334455, 4: 0x445566, 8: 0x556677,
      16: 0x667788, 32: 0x778899, 64: 0x8899aa, 128: 0x99aabb,
    };

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = this.grid[r][c];
        this.cells[r][c].setFillStyle(colors[val] ?? 0xaabbcc);
        this.labels[r][c].setText(val > 0 ? String(val) : '');
      }
    }
    this.scoreLabel.setText(`Score: ${this.score}`);
  }
}
