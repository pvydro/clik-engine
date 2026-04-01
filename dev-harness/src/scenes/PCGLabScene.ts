import { BaseScene, ConsoleReporter, Button, TileType, PCGPlugin, Transitions } from 'clik-engine';
import type { GeneratedLevel, PCGConfig } from 'clik-engine';
import Phaser from 'phaser';

const GENERATORS = ['dungeon', 'platformer', 'arena'] as const;
const CONSTRAINT_MODES = [
  { label: 'No Constraints', names: [] },
  { label: 'Reachability Only', names: ['reachability'] },
  { label: 'All Constraints', names: ['reachability', 'entity-density', 'difficulty'] },
];

const TILE_COLORS: Record<number, number> = {
  [TileType.EMPTY]: 0x000000,
  [TileType.FLOOR]: 0x1a1a2e,
  [TileType.WALL]: 0x333344,
  [TileType.DOOR]: 0x4a3728,
  [TileType.SPAWN]: 0x00ff88,
  [TileType.EXIT]: 0xff4444,
  [TileType.HAZARD]: 0xff6600,
  [TileType.PLATFORM]: 0x2a5a8a,
  [TileType.DECORATION]: 0x2a2a3e,
};

export class PCGLabScene extends BaseScene {
  private generatorIndex = 0;
  private constraintIndex = 0;
  private difficulty = 5;
  private seed = 42;
  private level!: GeneratedLevel;

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private statsText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private constraintText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private genButtons: Button[] = [];

  constructor() {
    super({ key: 'pcg-lab' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Title
    this.titleText = this.add.text(width / 2, 20, 'PCG Lab', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ff88',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Generator selector buttons
    const btnY = 60;
    GENERATORS.forEach((name, i) => {
      const btn = new Button(this, {
        x: width / 2 + (i - 1) * 150,
        y: btnY,
        text: name.charAt(0).toUpperCase() + name.slice(1),
        onClick: () => {
          this.generatorIndex = i;
          this.seed = Math.floor(Math.random() * 0x7fffffff);
          this.generate();
        },
      });
      this.genButtons.push(btn);
    });

    // Back button
    new Button(this, {
      x: 70,
      y: 20,
      text: '← Back',
      onClick: () => this.director.go('pcg-lab', 'sandbox', Transitions.fade(400)),
    });

    // Grid area
    this.gridGraphics = this.add.graphics();

    // Stats panel (right side)
    this.statsText = this.add.text(width - 10, 100, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      align: 'right',
      lineSpacing: 4,
    }).setOrigin(1, 0);

    // Constraint mode display
    this.constraintText = this.add.text(width / 2, height - 50, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffaa00',
    }).setOrigin(0.5);

    // Controls
    this.controlsText = this.add.text(width / 2, height - 20, '1/2/3: Generator | R: Regen | D/F: Difficulty | C: Constraints', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#555555',
    }).setOrigin(0.5);

    this.generate();

    this.inspectState('pcg-lab', () => ({
      generator: GENERATORS[this.generatorIndex],
      seed: this.seed,
      difficulty: this.difficulty,
      constraints: CONSTRAINT_MODES[this.constraintIndex].label,
      rooms: this.level?.metadata.roomCount,
      entities: this.level?.entities.length,
    }));

    ConsoleReporter.scene('PCGLabScene ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (this.actions.justPressed('pcg_gen_1')) { this.generatorIndex = 0; this.generate(); }
    if (this.actions.justPressed('pcg_gen_2')) { this.generatorIndex = 1; this.generate(); }
    if (this.actions.justPressed('pcg_gen_3')) { this.generatorIndex = 2; this.generate(); }

    if (this.actions.justPressed('pcg_regen')) {
      this.seed = Math.floor(Math.random() * 0x7fffffff);
      this.generate();
    }

    if (this.actions.justPressed('pcg_diff_up')) {
      this.difficulty = Math.min(10, this.difficulty + 1);
      this.generate();
    }

    if (this.actions.justPressed('pcg_diff_down')) {
      this.difficulty = Math.max(1, this.difficulty - 1);
      this.generate();
    }

    if (this.actions.justPressed('pcg_constraints')) {
      this.constraintIndex = (this.constraintIndex + 1) % CONSTRAINT_MODES.length;
      this.generate();
    }
  }

  private generate(): void {
    const pcgPlugin = (globalThis as Record<string, unknown>).__CLIK_PCG as InstanceType<typeof PCGPlugin>['registry'] | undefined;
    if (!pcgPlugin) {
      ConsoleReporter.error('PCGPlugin registry not found on globalThis.__CLIK_PCG');
      return;
    }

    const generatorName = GENERATORS[this.generatorIndex];
    const constraints = CONSTRAINT_MODES[this.constraintIndex];

    // Adjust grid size per generator
    let gridW = 50;
    let gridH = 40;
    if (generatorName === 'platformer') { gridW = 60; gridH = 20; }
    if (generatorName === 'arena') { gridW = 35; gridH = 35; }

    const config: PCGConfig = {
      width: gridW,
      height: gridH,
      seed: this.seed,
      difficulty: this.difficulty,
    };

    try {
      this.level = pcgPlugin.generate(generatorName, config, constraints.names.length > 0 ? constraints.names : undefined);
      this.renderGrid();
      this.updateStats();
    } catch (err) {
      ConsoleReporter.error(`PCG generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private renderGrid(): void {
    this.gridGraphics.clear();

    const { width: canvasW, height: canvasH } = this.scale;
    const grid = this.level.grid;

    // Auto-size tiles to fit canvas
    const availW = canvasW * 0.65;
    const availH = canvasH - 140; // top + bottom bars
    const tileSize = Math.floor(Math.min(availW / grid.width, availH / grid.height));
    const offsetX = 20;
    const offsetY = 90;

    // Draw tiles
    grid.forEach((tile, x, y) => {
      const color = TILE_COLORS[tile] ?? 0x000000;
      this.gridGraphics.fillStyle(color, 1);
      this.gridGraphics.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize - 1, tileSize - 1);
    });

    // Draw entity placements
    for (const entity of this.level.entities) {
      const ex = offsetX + entity.x * tileSize + tileSize / 2;
      const ey = offsetY + entity.y * tileSize + tileSize / 2;
      const r = Math.max(2, tileSize / 4);

      if (entity.type === 'enemy') {
        this.gridGraphics.fillStyle(0xff3333, 0.8);
        this.gridGraphics.fillCircle(ex, ey, r);
      } else if (entity.type === 'item' || entity.type === 'collectible') {
        this.gridGraphics.fillStyle(0xffdd44, 0.8);
        this.gridGraphics.fillCircle(ex, ey, r);
      }
    }

    // Spawn marker (bright green border)
    const sx = offsetX + this.level.spawn.x * tileSize;
    const sy = offsetY + this.level.spawn.y * tileSize;
    this.gridGraphics.lineStyle(2, 0x00ff88, 1);
    this.gridGraphics.strokeRect(sx, sy, tileSize - 1, tileSize - 1);

    // Exit marker (bright red border)
    const exx = offsetX + this.level.exit.x * tileSize;
    const exy = offsetY + this.level.exit.y * tileSize;
    this.gridGraphics.lineStyle(2, 0xff4444, 1);
    this.gridGraphics.strokeRect(exx, exy, tileSize - 1, tileSize - 1);
  }

  private updateStats(): void {
    const m = this.level.metadata;
    const enemies = this.level.entities.filter(e => e.type === 'enemy').length;
    const items = this.level.entities.filter(e => e.type === 'item' || e.type === 'collectible').length;
    const mode = CONSTRAINT_MODES[this.constraintIndex];

    this.statsText.setText(
      `Generator: ${GENERATORS[this.generatorIndex]}\n` +
      `Seed: ${m.seed}\n` +
      `Difficulty: ${this.difficulty}\n` +
      `Grid: ${this.level.grid.width}x${this.level.grid.height}\n` +
      `\n` +
      `Rooms: ${m.roomCount ?? '-'}\n` +
      `Path Length: ${m.pathLength ?? '-'}\n` +
      `Gen Time: ${m.generationTimeMs.toFixed(1)}ms\n` +
      `\n` +
      `Enemies: ${enemies}\n` +
      `Items: ${items}\n` +
      `Total Entities: ${this.level.entities.length}\n` +
      `\n` +
      `Spawn: (${this.level.spawn.x}, ${this.level.spawn.y})\n` +
      `Exit: (${this.level.exit.x}, ${this.level.exit.y})`,
    );

    this.constraintText.setText(`Constraints: ${mode.label}`);
  }
}
