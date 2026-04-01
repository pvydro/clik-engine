import {
  BaseScene,
  ConsoleReporter,
  TileType,
  PCGPlugin,
  Toast,
} from 'clik-engine';
import type { GeneratedLevel } from 'clik-engine';
import Phaser from 'phaser';

const TILE_SIZE = 16;
const PLAYER_SPEED = 200;

const TILE_COLORS: Record<number, number> = {
  [TileType.EMPTY]: 0x000000,
  [TileType.FLOOR]: 0x1a1a2e,
  [TileType.WALL]: 0x333344,
  [TileType.DOOR]: 0x4a3728,
  [TileType.SPAWN]: 0x1a2e1a,
  [TileType.EXIT]: 0x2e1a1a,
  [TileType.HAZARD]: 0xff6600,
  [TileType.PLATFORM]: 0x2a3a4a,
  [TileType.DECORATION]: 0x2a2a3e,
};

export class GameScene extends BaseScene {
  private level!: GeneratedLevel;
  private floor = 1;
  private seed = Math.floor(Math.random() * 0x7fffffff);
  private difficulty = 3;
  private itemsCollected = 0;
  private totalItems = 0;

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private entityGraphics!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private items!: Phaser.Physics.Arcade.StaticGroup;
  private exitZone!: Phaser.Physics.Arcade.StaticGroup;
  private hudText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    this.cameras.main.setBackgroundColor('#000000');
    this.gridGraphics = this.add.graphics();
    this.entityGraphics = this.add.graphics();

    // HUD (fixed to camera)
    this.hudText = this.add.text(8, 8, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ff88',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    this.controlsText = this.add.text(8, this.scale.height - 28, 'WASD: Move | R: Regen | N: Next Floor | +/-: Difficulty', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666666',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    this.generateLevel();

    this.inspectState('dungeon', () => ({
      floor: this.floor,
      seed: this.seed,
      difficulty: this.difficulty,
      items: `${this.itemsCollected}/${this.totalItems}`,
      rooms: this.level?.metadata.roomCount,
      pathLen: this.level?.metadata.pathLength,
    }));

    ConsoleReporter.scene('PCG Dungeon GameScene ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Player movement
    let vx = 0;
    let vy = 0;
    if (this.actions.isDown('move_left')) vx = -PLAYER_SPEED;
    if (this.actions.isDown('move_right')) vx = PLAYER_SPEED;
    if (this.actions.isDown('move_up')) vy = -PLAYER_SPEED;
    if (this.actions.isDown('move_down')) vy = PLAYER_SPEED;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.playerBody.setVelocity(vx, vy);

    // Controls
    if (this.actions.justPressed('regenerate')) {
      this.seed = Math.floor(Math.random() * 0x7fffffff);
      this.generateLevel();
      new Toast(this, { text: `Regenerated (seed: ${this.seed})`, duration: 1500 });
    }

    if (this.actions.justPressed('next_level')) {
      this.advanceFloor();
    }

    if (this.actions.justPressed('difficulty_up')) {
      this.difficulty = Math.min(10, this.difficulty + 1);
      this.generateLevel();
      new Toast(this, { text: `Difficulty: ${this.difficulty}`, duration: 1000 });
    }

    if (this.actions.justPressed('difficulty_down')) {
      this.difficulty = Math.max(1, this.difficulty - 1);
      this.generateLevel();
      new Toast(this, { text: `Difficulty: ${this.difficulty}`, duration: 1000 });
    }

    this.updateHUD();
  }

  private generateLevel(): void {
    // Get PCG registry from plugin
    const pcgPlugin = (globalThis as Record<string, unknown>).__PCG_PLUGIN as PCGPlugin | undefined;
    if (!pcgPlugin) {
      ConsoleReporter.error('PCGPlugin not found', 'Add PCGPlugin to config.plugins');
      return;
    }

    const config = {
      width: 50,
      height: 40,
      seed: this.seed,
      difficulty: this.difficulty,
    };

    this.level = pcgPlugin.registry.generate('dungeon', config, ['reachability', 'difficulty']);
    this.itemsCollected = 0;
    this.totalItems = this.level.entities.filter(e => e.type === 'item').length;

    this.renderLevel();
    this.spawnPlayer();
    this.setupCamera();

    ConsoleReporter.engine(
      `Floor ${this.floor}: ${this.level.metadata.roomCount} rooms, ` +
      `${this.level.entities.length} entities, ` +
      `${this.level.metadata.generationTimeMs.toFixed(1)}ms`,
    );
  }

  private renderLevel(): void {
    const grid = this.level.grid;

    // Clear previous
    this.gridGraphics.clear();
    this.entityGraphics.clear();
    if (this.walls) this.walls.clear(true, true);
    else this.walls = this.physics.add.staticGroup();
    if (this.items) this.items.clear(true, true);
    else this.items = this.physics.add.staticGroup();
    if (this.exitZone) this.exitZone.clear(true, true);
    else this.exitZone = this.physics.add.staticGroup();

    // Draw tiles
    grid.forEach((tile, x, y) => {
      const color = TILE_COLORS[tile] ?? 0x000000;
      this.gridGraphics.fillStyle(color, 1);
      this.gridGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Create wall physics bodies
      if (tile === TileType.WALL) {
        const wallBlock = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
        );
        wallBlock.setVisible(false);
        this.walls.add(wallBlock);
      }
    });

    // Refresh static bodies after adding all walls
    this.walls.refresh();

    // Draw spawn marker
    this.gridGraphics.fillStyle(0x00ff88, 1);
    this.gridGraphics.fillRect(
      this.level.spawn.x * TILE_SIZE + 2,
      this.level.spawn.y * TILE_SIZE + 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
    );

    // Draw exit marker
    this.gridGraphics.fillStyle(0xff4444, 1);
    this.gridGraphics.fillRect(
      this.level.exit.x * TILE_SIZE + 2,
      this.level.exit.y * TILE_SIZE + 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
    );

    // Create exit overlap zone
    const exitBlock = this.add.rectangle(
      this.level.exit.x * TILE_SIZE + TILE_SIZE / 2,
      this.level.exit.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE, TILE_SIZE,
    ).setVisible(false);
    this.exitZone.add(exitBlock);
    this.exitZone.refresh();

    // Draw entities
    for (const entity of this.level.entities) {
      const ex = entity.x * TILE_SIZE + TILE_SIZE / 2;
      const ey = entity.y * TILE_SIZE + TILE_SIZE / 2;

      if (entity.type === 'enemy') {
        this.entityGraphics.fillStyle(0xff3333, 0.9);
        this.entityGraphics.fillCircle(ex, ey, TILE_SIZE / 3);
      } else if (entity.type === 'item') {
        // Yellow diamond — create as physics body for collection
        this.entityGraphics.fillStyle(0xffdd44, 0.9);
        this.entityGraphics.fillRect(ex - 3, ey - 3, 6, 6);

        const itemBlock = this.add.rectangle(ex, ey, TILE_SIZE * 0.6, TILE_SIZE * 0.6).setVisible(false);
        this.items.add(itemBlock);
      }
    }
    this.items.refresh();
  }

  private spawnPlayer(): void {
    const px = this.level.spawn.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.level.spawn.y * TILE_SIZE + TILE_SIZE / 2;

    if (this.player) {
      this.player.setPosition(px, py);
      this.playerBody.setVelocity(0, 0);
    } else {
      this.player = this.add.circle(px, py, TILE_SIZE / 2.5, 0x00ff88);
      this.physics.add.existing(this.player);
      this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      this.playerBody.setCircle(TILE_SIZE / 2.5);
      this.playerBody.setCollideWorldBounds(false);
    }

    this.player.setDepth(10);

    // Collisions
    this.physics.add.collider(this.player, this.walls);

    // Item collection
    this.physics.add.overlap(this.player, this.items, (_player, item) => {
      (item as Phaser.GameObjects.Rectangle).destroy();
      this.itemsCollected++;
      new Toast(this, { text: `Item! (${this.itemsCollected}/${this.totalItems})`, duration: 800 });
    });

    // Exit overlap
    this.physics.add.overlap(this.player, this.exitZone, () => {
      this.advanceFloor();
    });
  }

  private advanceFloor(): void {
    this.floor++;
    this.difficulty = Math.min(10, Math.ceil(this.floor * 0.8) + 2);
    this.seed = Math.floor(Math.random() * 0x7fffffff);
    this.generateLevel();
    new Toast(this, { text: `Floor ${this.floor} — Difficulty ${this.difficulty}`, duration: 2000 });
  }

  private setupCamera(): void {
    const worldW = this.level.grid.width * TILE_SIZE;
    const worldH = this.level.grid.height * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  private updateHUD(): void {
    const m = this.level.metadata;
    this.hudText.setText(
      `Floor ${this.floor}  Seed: ${m.seed}  Diff: ${this.difficulty}\n` +
      `Items: ${this.itemsCollected}/${this.totalItems}  ` +
      `Rooms: ${m.roomCount ?? '?'}  Path: ${m.pathLength ?? '?'}  ` +
      `Gen: ${m.generationTimeMs.toFixed(1)}ms`,
    );
  }
}
