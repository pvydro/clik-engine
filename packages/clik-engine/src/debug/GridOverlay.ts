import Phaser from 'phaser';

export class GridOverlay extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private cellSize = 64;
  private gridColor = 0x333333;
  private gridAlpha = 0.3;
  private visible = false;

  constructor() {
    super({ key: '__clik_grid_overlay' });
  }

  create(): void {
    this.gridGraphics = this.add.graphics().setDepth(9998);
    if (this.visible) this.drawGrid();
  }

  configure(cellSize: number, color = 0x333333, alpha = 0.3): void {
    this.cellSize = cellSize;
    this.gridColor = color;
    this.gridAlpha = alpha;
    if (this.visible) this.drawGrid();
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.drawGrid();
    } else {
      this.gridGraphics.clear();
    }
  }

  show(): void {
    this.visible = true;
    this.drawGrid();
  }

  hide(): void {
    this.visible = false;
    this.gridGraphics.clear();
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, this.gridColor, this.gridAlpha);

    const { width, height } = this.scale;

    for (let x = 0; x <= width; x += this.cellSize) {
      this.gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += this.cellSize) {
      this.gridGraphics.lineBetween(0, y, width, y);
    }
  }
}
