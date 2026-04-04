import {
  BaseScene, ConsoleReporter, Toast,
  GraphicsParticles, ComboDisplay, AnimatedHUD,
  GameFeelPresets, SceneUtils,
  Entity, EntityFactory, EntityPool,
  Movement, Health, Hitbox, Hurtbox, CullOffscreen,
  CombatManager,
  HierarchicalStateMachine,
  ParallaxManager,
  DestructibleTiles,
  TileEffects,
  SquadCoordinator,
  CancelWindow,
  ComboGraph,
  InputBuffer,
  GPUParticleEmitter,
} from 'clik-engine';
import type { DamageEvent } from 'clik-engine';
import Phaser from 'phaser';
import { LEVEL_1, TILE_SIZE, LEVEL_COLS, LEVEL_ROWS, ENEMY_SPAWNS } from '../levels';

// ── Constants ──────────────────────────────────────────────────────
const GRAVITY = 900;
const PLAYER_SPEED = 250;
const JUMP_VELOCITY = -420;
const DASH_SPEED = 500;
const DASH_DURATION = 180;
const WALL_SLIDE_SPEED = 80;
const WALL_JUMP_VX = 280;
const WALL_JUMP_VY = -380;

// ── Player FSM context ─────────────────────────────────────────────
interface PlayerCtx {
  scene: GameScene;
  player: Entity;
  vx: number;
  vy: number;
  grounded: boolean;
  wallLeft: boolean;
  wallRight: boolean;
  dashTimer: number;
  facingRight: boolean;
}

export class GameScene extends BaseScene {
  // Player
  private player!: Entity;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private playerCtx!: PlayerCtx;

  // FSMs
  private locoFSM!: HierarchicalStateMachine<PlayerCtx>;
  private combatFSM!: HierarchicalStateMachine<PlayerCtx>;
  private cancelWindow!: CancelWindow;
  private comboGraph!: ComboGraph;
  private inputBuffer!: InputBuffer;

  // Level
  private solidTiles: Phaser.GameObjects.Rectangle[] = [];
  private tileGrid: number[][] = [];

  // Systems
  private factory!: EntityFactory;
  private enemyPool!: EntityPool;
  private combat!: CombatManager;
  private parallax!: ParallaxManager;
  private destructible!: DestructibleTiles;
  private tileEffects!: TileEffects;
  private squad!: SquadCoordinator;
  private particles!: GraphicsParticles;
  private gpuParticles!: GPUParticleEmitter;
  private comboDisplay!: ComboDisplay;
  private hud!: AnimatedHUD;

  // State
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private isGameOver = false;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0d1117');

    if (this.physics?.world) {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
    }

    // ── Systems ──────────────────────────────────────────────────
    this.particles = new GraphicsParticles(this);
    this.comboDisplay = new ComboDisplay(this, { particles: this.particles, y: 60 });
    this.entities.enableSpatial({ cellSize: 64 });

    this.gpuParticles = new GPUParticleEmitter(this, {
      maxParticles: 2000, lifetime: 400, rate: 0,
      speedMin: 50, speedMax: 200, sizeMin: 1, sizeMax: 3,
      gravity: 200, color: 0x44aa44, fadeOut: true,
    });
    this.gpuParticles.start();

    this.inputBuffer = new InputBuffer(300, 30);
    this.cancelWindow = new CancelWindow();
    this.comboGraph = new ComboGraph();

    this.tileEffects = new TileEffects();
    this.destructible = new DestructibleTiles({ maxHealth: 1 });

    this.squad = new SquadCoordinator({ maxAttackers: 2 });

    // ── Build level ─────────────────────────────────────────────
    this.buildLevel();

    // ── Parallax backgrounds ────────────────────────────────────
    this.buildParallax();

    // ── Entity factory + pools ──────────────────────────────────
    this.factory = new EntityFactory().useRegistry(this.entities);
    this.enemyPool = new EntityPool(this.factory, this, { prefabName: 'enemy', maxSize: 20 });
    this.enemyPool.useRegistry(this.entities);
    this.registerPrefabs();

    // ── Player ──────────────────────────────────────────────────
    this.createPlayer();
    this.setupPlayerFSMs();

    // ── Enemies ─────────────────────────────────────────────────
    this.spawnEnemies();

    // ── Combat ──────────────────────────────────────────────────
    this.combat = new CombatManager(this.entities);
    this.combat.setFilter((attacker, defender) => {
      if (attacker.entityType === 'player') return defender.entityType !== 'player';
      return defender.entityType === 'player';
    });
    this.combat.onDamage((event: DamageEvent) => {
      if (event.target === this.player) this.onPlayerHit(event);
    });
    this.combat.onKill((event: DamageEvent) => {
      if (event.target !== this.player) this.onEnemyKill(event);
    });

    // ── Camera ──────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, LEVEL_COLS * TILE_SIZE, LEVEL_ROWS * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(60, 40);

    // ── Tile effects ────────────────────────────────────────────
    this.tileEffects.register({
      property: 'hazard', value: true,
      onStay: (entity) => {
        const health = entity.getComponent<Health>('health');
        if (health && !health.isDead) {
          health.damage(1);
          const hurtbox = entity.getComponent<Hurtbox>('hurtbox');
          hurtbox?.triggerIframes(1000);
          SceneUtils.screenFlash(this, 0xff0000, 150);
        }
      },
    });
    this.tileEffects.register({
      property: 'ice', value: true,
      onEnter: () => { /* visual indicator only in this demo */ },
    });

    // ── Destructible tiles ──────────────────────────────────────
    this.destructible.onDestroy((tx, ty) => {
      this.gpuParticles.burst(10, tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
      this.removeTileAt(tx, ty);
    });

    // ── HUD ─────────────────────────────────────────────────────
    this.hud = new AnimatedHUD(this);
    this.hud.addCounter('hp', { label: 'HP', x: 60, y: 30, color: 0x00ff88 });
    this.hud.addCounter('score', { label: 'SCORE', x: width - 80, y: 30, color: 0xffcc00 });
    this.hud.updateCounter('hp', 5);

    this.add.text(width / 2, height - 16, 'A/D move | Space jump | X attack | Shift dash | Wall-jump off walls', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5).setScrollFactor(0);

    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.3);

    this.inspectState('platformer', () => ({
      hp: this.player.getComponent<Health>('health')?.current,
      score: this.score,
      combo: this.combo,
      loco: this.locoFSM.getCurrent(),
      combat: this.combatFSM.getCurrent(),
      vx: Math.round(this.playerCtx.vx),
      vy: Math.round(this.playerCtx.vy),
      grounded: this.playerCtx.grounded,
    }));

    ConsoleReporter.scene('Platformer ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.isGameOver) return;

    const dt = delta / 1000;
    const ctx = this.playerCtx;

    // ── Record inputs to buffer ─────────────────────────────────
    if (this.actions.justPressed('attack')) this.inputBuffer.record('attack');
    if (this.actions.justPressed('jump')) this.inputBuffer.record('jump');
    if (this.actions.justPressed('dash')) this.inputBuffer.record('dash');

    // ── Collision detection (before movement) ───────────────────
    ctx.grounded = this.checkGround(ctx.player.x, ctx.player.y, 10, 16);
    ctx.wallLeft = this.checkWall(ctx.player.x - 11, ctx.player.y, -1);
    ctx.wallRight = this.checkWall(ctx.player.x + 11, ctx.player.y, 1);

    // ── FSM updates ─────────────────────────────────────────────
    this.locoFSM.update(delta);
    this.combatFSM.update(delta);

    // ── Apply velocity ──────────────────────────────────────────
    // Gravity
    if (!ctx.grounded) {
      ctx.vy += GRAVITY * dt;
    }

    // Apply movement
    ctx.player.x += ctx.vx * dt;
    ctx.player.y += ctx.vy * dt;

    // ── Tile collision resolution ───────────────────────────────
    this.resolveTileCollisions(ctx);

    // ── Update visual ───────────────────────────────────────────
    if (ctx.vx > 0) ctx.facingRight = true;
    else if (ctx.vx < 0) ctx.facingRight = false;

    // Color based on state
    const locoState = this.locoFSM.getCurrent();
    const combatState = this.combatFSM.getCurrent();
    let color = 0x00ff88; // idle
    if (locoState === 'dash') color = 0x4488ff;
    else if (locoState === 'wall_slide') color = 0xffaa00;
    else if (locoState === 'run') color = 0x00ffaa;
    else if (locoState === 'jump_rise' || locoState === 'jump_fall') color = 0x88ffcc;
    if (combatState?.startsWith('attack')) color = 0xffff00;
    if (combatState === 'hitstun') color = 0xff0000;
    this.playerBody.setFillStyle(color);

    // ── Tile effects check ──────────────────────────────────────
    const tileCol = Math.floor(ctx.player.x / TILE_SIZE);
    const tileRow = Math.floor((ctx.player.y + 14) / TILE_SIZE); // feet position
    if (tileCol >= 0 && tileCol < LEVEL_COLS && tileRow >= 0 && tileRow < LEVEL_ROWS) {
      const tileType = this.tileGrid[tileRow]?.[tileCol] ?? 0;
      const props: Record<string, unknown> = {};
      if (tileType === 2) props['hazard'] = true;
      if (tileType === 3) props['ice'] = true;
      this.tileEffects.check(ctx.player, props, tileCol, tileRow, delta);
    }

    // ── Combo decay ─────────────────────────────────────────────
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // ── Enemy AI ────────────────────────────────────────────────
    this.updateEnemies(dt);

    // ── Systems ─────────────────────────────────────────────────
    this.combat.update();
    this.squad.update();
    this.gpuParticles.update(delta);

    // ── Death pit ───────────────────────────────────────────────
    if (ctx.player.y > LEVEL_ROWS * TILE_SIZE + 100) {
      const health = ctx.player.getComponent<Health>('health')!;
      if (!health.isDead) {
        health.damage(health.current);
        this.onPlayerDeath();
      }
    }
  }

  // ── Level building ─────────────────────────────────────────────

  private buildLevel(): void {
    this.tileGrid = LEVEL_1;
    const colors: Record<number, number> = {
      1: 0x334455, // solid
      2: 0xcc2222, // spike
      3: 0x88ccff, // ice
      4: 0x665533, // destructible
      5: 0x225533, // one-way
    };

    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        const tile = this.tileGrid[row][col];
        if (tile === 0) continue;

        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const color = colors[tile] ?? 0x334455;
        const rect = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color);
        rect.setDepth(1);

        if (tile === 2) {
          // Spike visual: add triangle
          const g = this.add.graphics();
          g.fillStyle(0xff4444);
          g.fillTriangle(x - 8, y + 12, x + 8, y + 12, x, y - 8);
          g.setDepth(2);
        }

        if (tile === 4) {
          this.destructible.registerTile(col, row);
        }

        if (tile !== 2) {
          this.solidTiles.push(rect);
        }
      }
    }
  }

  private removeTileAt(col: number, row: number): void {
    this.tileGrid[row][col] = 0;
    // Find and remove the rectangle
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = row * TILE_SIZE + TILE_SIZE / 2;
    const idx = this.solidTiles.findIndex(r => Math.abs(r.x - x) < 2 && Math.abs(r.y - y) < 2);
    if (idx >= 0) {
      this.solidTiles[idx].destroy();
      this.solidTiles.splice(idx, 1);
    }
  }

  private buildParallax(): void {
    this.parallax = new ParallaxManager(this);

    // Background layer 1 — distant mountains (dark shapes)
    const bg1 = this.add.graphics();
    bg1.fillStyle(0x0a1520);
    for (let i = 0; i < 15; i++) {
      const bx = i * 300;
      const bh = 80 + Math.sin(i * 1.3) * 40;
      bg1.fillRect(bx, 400 - bh, 200, bh + 200);
    }
    bg1.setDepth(-3);
    this.parallax.addLayer({ name: 'mountains', gameObject: bg1, scrollFactorX: 0.1, scrollFactorY: 0.1 });

    // Background layer 2 — trees
    const bg2 = this.add.graphics();
    bg2.fillStyle(0x142820);
    for (let i = 0; i < 25; i++) {
      const tx = i * 180 + Math.sin(i * 2.7) * 30;
      bg2.fillRect(tx, 350, 12, 100);
      bg2.fillTriangle(tx - 20, 370, tx + 32, 370, tx + 6, 300);
    }
    bg2.setDepth(-2);
    this.parallax.addLayer({ name: 'trees', gameObject: bg2, scrollFactorX: 0.3, scrollFactorY: 0.3 });

    // Background layer 3 — bushes
    const bg3 = this.add.graphics();
    bg3.fillStyle(0x1a3a25);
    for (let i = 0; i < 40; i++) {
      const bx = i * 110;
      bg3.fillCircle(bx, 500, 15 + Math.sin(i * 1.7) * 8);
    }
    bg3.setDepth(-1);
    this.parallax.addLayer({ name: 'bushes', gameObject: bg3, scrollFactorX: 0.6, scrollFactorY: 0.5 });
  }

  // ── Prefabs ────────────────────────────────────────────────────

  private registerPrefabs(): void {
    this.factory.register('enemy', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'walker';
      const rect = scene.add.rectangle(0, 0, 16, 20, 0xff4444);
      e.add(rect);
      e.addComponent('movement', new Movement(60));
      e.addComponent('health', new Health(2));
      e.addComponent('hitbox', new Hitbox([
        { offsetX: -8, offsetY: -10, width: 16, height: 20, damageAmount: 1, damageType: 'physical' },
      ]));
      e.addComponent('hurtbox', new Hurtbox([
        { offsetX: -8, offsetY: -10, width: 16, height: 20 },
      ]));
      e.addComponent('cull', new CullOffscreen(200).usePool(this.enemyPool));
      e.addTag('spatial');
      return e;
    });
  }

  // ── Player ─────────────────────────────────────────────────────

  private createPlayer(): void {
    // Spawn at column 3, one tile above ground
    this.player = new Entity(this, 3 * TILE_SIZE + TILE_SIZE / 2, (LEVEL_ROWS - 2) * TILE_SIZE);
    this.player.entityType = 'player';

    this.playerBody = this.add.rectangle(0, 0, 16, 28, 0x00ff88);
    this.player.add(this.playerBody);
    this.player.setDepth(10);

    this.player.addComponent('health', new Health(5));
    this.player.addComponent('hurtbox', new Hurtbox([
      { offsetX: -8, offsetY: -14, width: 16, height: 28 },
    ]));
    this.player.addComponent('hitbox', new Hitbox([
      { offsetX: -16, offsetY: -14, width: 32, height: 28, damageAmount: 1, damageType: 'physical', tag: 'attack' },
    ]));
    this.player.getComponent<Hitbox>('hitbox')!.disableByTag('attack');
    this.player.addTag('spatial');
    this.entities.register(this.player);

    this.playerCtx = {
      scene: this,
      player: this.player,
      vx: 0, vy: 0,
      grounded: false, wallLeft: false, wallRight: false,
      dashTimer: 0, facingRight: true,
    };
  }

  private setupPlayerFSMs(): void {
    const ctx = this.playerCtx;

    // ── Locomotion FSM ──────────────────────────────────────────
    this.locoFSM = new HierarchicalStateMachine<PlayerCtx>(ctx, 'loco');

    this.locoFSM.addState('idle', {
      hooks: {
        enter: (c) => { c.vx = 0; },
        update: (c) => {
          if (this.actions.isDown('move_left') || this.actions.isDown('move_right')) {
            this.locoFSM.transitionTo('run');
          }
        },
      },
    });

    this.locoFSM.addState('run', {
      hooks: {
        update: (c) => {
          c.vx = 0;
          if (this.actions.isDown('move_left')) c.vx = -PLAYER_SPEED;
          if (this.actions.isDown('move_right')) c.vx = PLAYER_SPEED;
          if (c.vx === 0) this.locoFSM.transitionTo('idle');
        },
      },
    });

    this.locoFSM.addState('jump_rise', {
      hooks: {
        enter: (c) => {
          c.vy = JUMP_VELOCITY;
          this.audio.procedural.tone({ frequency: 600, type: 'sine', duration: 0.04, volume: 0.06 });
        },
        update: (c) => {
          if (this.actions.isDown('move_left')) c.vx = -PLAYER_SPEED;
          else if (this.actions.isDown('move_right')) c.vx = PLAYER_SPEED;
          else c.vx = 0;
        },
      },
    });

    this.locoFSM.addState('jump_fall', {
      hooks: {
        update: (c) => {
          if (this.actions.isDown('move_left')) c.vx = -PLAYER_SPEED;
          else if (this.actions.isDown('move_right')) c.vx = PLAYER_SPEED;
          else c.vx = 0;
        },
      },
    });

    this.locoFSM.addState('land', {
      hooks: {
        enter: () => { /* brief landing frame */ },
      },
    });

    this.locoFSM.addState('wall_slide', {
      hooks: {
        enter: (c) => { c.vy = 0; },
        update: (c) => {
          c.vy = WALL_SLIDE_SPEED;
          c.vx = 0;
        },
      },
    });

    this.locoFSM.addState('wall_jump', {
      hooks: {
        enter: (c) => {
          c.vy = WALL_JUMP_VY;
          c.vx = c.wallLeft ? WALL_JUMP_VX : -WALL_JUMP_VX;
          this.audio.procedural.tone({ frequency: 700, type: 'sine', duration: 0.04, volume: 0.06 });
        },
      },
    });

    this.locoFSM.addState('dash', {
      tags: ['invincible'],
      hooks: {
        enter: (c) => {
          c.dashTimer = DASH_DURATION;
          c.vx = c.facingRight ? DASH_SPEED : -DASH_SPEED;
          c.vy = 0;
          const hurtbox = c.player.getComponent<Hurtbox>('hurtbox')!;
          hurtbox.triggerIframes(DASH_DURATION + 50);
          this.gpuParticles.burst(8, c.player.x, c.player.y);
          this.audio.procedural.tone({ frequency: 300, type: 'sine', duration: 0.08, volume: 0.08 });
        },
        update: (c, delta) => {
          c.dashTimer -= delta;
          c.vy = 0; // No gravity during dash
        },
      },
    });

    // Transitions
    this.locoFSM.addTransition('idle', 'jump_rise', (c) => this.actions.justPressed('jump') && c.grounded);
    this.locoFSM.addTransition('run', 'jump_rise', (c) => this.actions.justPressed('jump') && c.grounded);
    this.locoFSM.addTransition('jump_rise', 'jump_fall', (c) => c.vy >= 0);
    this.locoFSM.addTransition('jump_fall', 'land', (c) => c.grounded);
    this.locoFSM.addTransition('land', 'idle', () => true);
    this.locoFSM.addTransition('idle', 'jump_fall', (c) => !c.grounded);
    this.locoFSM.addTransition('run', 'jump_fall', (c) => !c.grounded);

    // Wall slide: falling + touching wall + holding toward wall
    this.locoFSM.addTransition('jump_fall', 'wall_slide', (c) =>
      !c.grounded && ((c.wallLeft && this.actions.isDown('move_left')) || (c.wallRight && this.actions.isDown('move_right'))));
    this.locoFSM.addTransition('wall_slide', 'jump_fall', (c) => !c.wallLeft && !c.wallRight);
    this.locoFSM.addTransition('wall_slide', 'land', (c) => c.grounded);
    this.locoFSM.addTransition('wall_slide', 'wall_jump', () => this.actions.justPressed('jump'));

    this.locoFSM.addTimeoutTransition('wall_jump', { to: 'jump_fall', durationMs: 200 });

    // Dash from any grounded or airborne state
    for (const state of ['idle', 'run', 'jump_rise', 'jump_fall']) {
      this.locoFSM.addTransition(state, 'dash', () => this.actions.justPressed('dash'));
    }
    this.locoFSM.addTransition('dash', 'idle', (c) => c.dashTimer <= 0 && c.grounded);
    this.locoFSM.addTransition('dash', 'jump_fall', (c) => c.dashTimer <= 0 && !c.grounded);

    this.locoFSM.start('idle');

    // ── Combat FSM ──────────────────────────────────────────────
    this.combatFSM = new HierarchicalStateMachine<PlayerCtx>(ctx, 'combat');

    this.combatFSM.addState('ready', {
      hooks: {
        update: () => {
          if (this.actions.justPressed('attack')) {
            this.combatFSM.transitionTo('attack1');
          }
        },
      },
    });

    const makeAttackState = (name: string, next: string | null) => ({
      hooks: {
        enter: () => {
          const hitbox = this.player.getComponent<Hitbox>('hitbox')!;
          hitbox.enableByTag('attack');
          this.audio.procedural.tone({ frequency: 400, type: 'square', duration: 0.04, volume: 0.06 });
        },
        update: (_c: PlayerCtx, delta: number) => {
          // Check combo input during cancel window
          if (next && this.inputBuffer.wasActionInWindow('attack', 200)) {
            this.combatFSM.transitionTo(next);
          }
        },
        exit: () => {
          const hitbox = this.player.getComponent<Hitbox>('hitbox')!;
          hitbox.disableByTag('attack');
        },
      },
    });

    this.combatFSM.addState('attack1', makeAttackState('attack1', 'attack2'));
    this.combatFSM.addState('attack2', makeAttackState('attack2', 'attack3'));
    this.combatFSM.addState('attack3', makeAttackState('attack3', null));

    this.combatFSM.addState('hitstun', {
      tags: ['stunned'],
      hooks: {
        enter: (c) => {
          c.vx = c.facingRight ? -150 : 150;
          c.vy = -100;
        },
      },
    });

    this.combatFSM.addTimeoutTransition('attack1', { to: 'ready', durationMs: 300 });
    this.combatFSM.addTimeoutTransition('attack2', { to: 'ready', durationMs: 300 });
    this.combatFSM.addTimeoutTransition('attack3', { to: 'ready', durationMs: 400 });
    this.combatFSM.addTimeoutTransition('hitstun', { to: 'ready', durationMs: 500 });

    this.combatFSM.start('ready');
  }

  // ── Tile collision helpers ─────────────────────────────────────

  private isSolid(col: number, row: number): boolean {
    if (col < 0 || col >= LEVEL_COLS || row < 0 || row >= LEVEL_ROWS) return false;
    const t = this.tileGrid[row][col];
    return t === 1 || t === 3 || t === 4; // solid, ice, destructible
  }

  private isOneWay(col: number, row: number): boolean {
    if (col < 0 || col >= LEVEL_COLS || row < 0 || row >= LEVEL_ROWS) return false;
    return this.tileGrid[row][col] === 5;
  }

  private checkGround(x: number, y: number, halfW: number, halfH: number): boolean {
    const footY = y + halfH;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(footY / TILE_SIZE);
    // Check tile directly below feet
    if (this.isSolid(col, row)) {
      const tileTop = row * TILE_SIZE;
      return footY >= tileTop && footY <= tileTop + 4;
    }
    // One-way platforms: only collide from above
    if (this.isOneWay(col, row) && this.playerCtx.vy >= 0) {
      const tileTop = row * TILE_SIZE;
      return footY >= tileTop && footY <= tileTop + 6;
    }
    return false;
  }

  private checkWall(x: number, y: number, _dir: number): boolean {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this.isSolid(col, row);
  }

  private resolveTileCollisions(ctx: PlayerCtx): void {
    const halfW = 8;
    const halfH = 14;

    // Vertical collision
    const footY = ctx.player.y + halfH;
    const headY = ctx.player.y - halfH;
    const col = Math.floor(ctx.player.x / TILE_SIZE);

    // Ground
    const footRow = Math.floor(footY / TILE_SIZE);
    if (this.isSolid(col, footRow) || (this.isOneWay(col, footRow) && ctx.vy >= 0)) {
      const tileTop = footRow * TILE_SIZE;
      if (footY > tileTop && ctx.vy >= 0) {
        ctx.player.y = tileTop - halfH;
        ctx.vy = 0;
        ctx.grounded = true;
      }
    }

    // Ceiling
    const headRow = Math.floor(headY / TILE_SIZE);
    if (this.isSolid(col, headRow)) {
      const tileBottom = (headRow + 1) * TILE_SIZE;
      if (headY < tileBottom && ctx.vy < 0) {
        ctx.player.y = tileBottom + halfH;
        ctx.vy = 0;
      }
    }

    // Horizontal — left
    const leftCol = Math.floor((ctx.player.x - halfW) / TILE_SIZE);
    const midRow = Math.floor(ctx.player.y / TILE_SIZE);
    if (this.isSolid(leftCol, midRow)) {
      const tileRight = (leftCol + 1) * TILE_SIZE;
      if (ctx.player.x - halfW < tileRight) {
        ctx.player.x = tileRight + halfW;
        if (ctx.vx < 0) ctx.vx = 0;
      }
    }

    // Horizontal — right
    const rightCol = Math.floor((ctx.player.x + halfW) / TILE_SIZE);
    if (this.isSolid(rightCol, midRow)) {
      const tileLeft = rightCol * TILE_SIZE;
      if (ctx.player.x + halfW > tileLeft) {
        ctx.player.x = tileLeft - halfW;
        if (ctx.vx > 0) ctx.vx = 0;
      }
    }

    // Destructible tile attack
    if (this.combatFSM.getCurrent()?.startsWith('attack')) {
      const atkCol = Math.floor((ctx.player.x + (ctx.facingRight ? 16 : -16)) / TILE_SIZE);
      const atkRow = Math.floor(ctx.player.y / TILE_SIZE);
      if (this.destructible.isDestructible(atkCol, atkRow)) {
        this.destructible.damage(atkCol, atkRow, 1);
      }
    }
  }

  // ── Enemies ────────────────────────────────────────────────────

  private spawnEnemies(): void {
    for (const spawn of ENEMY_SPAWNS) {
      const x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
      const y = spawn.row * TILE_SIZE - 10;
      const enemy = this.enemyPool.acquire(x, y);
      if (!enemy) continue;

      enemy.entityType = spawn.type;
      enemy.addTag('spatial');
      const rect = enemy.list[0] as Phaser.GameObjects.Rectangle;
      const movement = enemy.getComponent<Movement>('movement')!;
      const health = enemy.getComponent<Health>('health')!;

      switch (spawn.type) {
        case 'walker':
          rect.setFillStyle(0xff4444);
          movement.speed = 60;
          health.max = 2;
          health.current = 2;
          break;
        case 'flyer':
          rect.setFillStyle(0xff8800);
          rect.setDisplaySize(14, 14);
          movement.speed = 40;
          health.max = 1;
          health.current = 1;
          break;
        case 'charger':
          rect.setFillStyle(0x882222);
          rect.setDisplaySize(22, 24);
          movement.speed = 0;
          health.max = 3;
          health.current = 3;
          break;
      }

      this.squad.addMember(enemy, 'attacker');
      this.squad.setTarget(this.player);
    }
  }

  private updateEnemies(dt: number): void {
    const enemies = this.entities.getByTag('spatial').filter(
      e => e !== this.player && e.entityType !== 'bullet' && e.active,
    );

    for (const enemy of enemies) {
      const movement = enemy.getComponent<Movement>('movement');
      if (!movement) continue;

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      switch (enemy.entityType) {
        case 'walker': {
          // Patrol: walk back and forth
          if (!enemy.getData('patrolDir')) enemy.setData('patrolDir', 1);
          let dir = enemy.getData('patrolDir') as number;
          const nextCol = Math.floor((enemy.x + dir * 16) / TILE_SIZE);
          const belowRow = Math.floor((enemy.y + 20) / TILE_SIZE);
          // Reverse at edges or walls
          if (this.isSolid(nextCol, Math.floor(enemy.y / TILE_SIZE)) || !this.isSolid(nextCol, belowRow)) {
            dir *= -1;
            enemy.setData('patrolDir', dir);
          }
          movement.setVelocity(movement.speed * dir, 0);
          // Apply gravity
          enemy.y += 200 * dt; // Simple gravity for enemies
          // Ground snap
          const eFootRow = Math.floor((enemy.y + 10) / TILE_SIZE);
          const eCol = Math.floor(enemy.x / TILE_SIZE);
          if (this.isSolid(eCol, eFootRow)) {
            enemy.y = eFootRow * TILE_SIZE - 10;
          }
          break;
        }
        case 'flyer': {
          // Bob up and down
          const elapsed = (enemy.getData('elapsed') as number ?? 0) + dt;
          enemy.setData('elapsed', elapsed);
          const baseY = enemy.getData('baseY') as number ?? enemy.y;
          if (!enemy.getData('baseY')) enemy.setData('baseY', enemy.y);
          enemy.y = baseY + Math.sin(elapsed * 3) * 30;
          // Drift toward player if close
          if (dist < 300) {
            enemy.x += (dx > 0 ? 1 : -1) * 30 * dt;
          }
          break;
        }
        case 'charger': {
          // Idle until player close, then charge
          if (dist < 200 && dist > 20) {
            const chargeSpeed = 200;
            movement.setVelocity((dx > 0 ? 1 : -1) * chargeSpeed, 0);
          } else {
            movement.stop();
          }
          // Simple gravity + ground
          enemy.y += 200 * dt;
          const cFootRow = Math.floor((enemy.y + 12) / TILE_SIZE);
          const cCol = Math.floor(enemy.x / TILE_SIZE);
          if (this.isSolid(cCol, cFootRow)) {
            enemy.y = cFootRow * TILE_SIZE - 12;
          }
          break;
        }
      }
    }
  }

  // ── Combat events ──────────────────────────────────────────────

  private onPlayerHit(event: DamageEvent): void {
    if (this.locoFSM.hasTag('invincible')) return;
    if (this.isGameOver) return;
    const health = this.player.getComponent<Health>('health')!;

    const hurtbox = this.player.getComponent<Hurtbox>('hurtbox')!;
    hurtbox.triggerIframes(1000);
    this.combatFSM.transitionTo('hitstun');

    this.particles.impact(this.player.x, this.player.y, 0x00ff88, 2);
    SceneUtils.screenFlash(this, 0xff0000, 200);
    SceneUtils.hitStop(this, 40);
    this.audio.procedural.explosion();
    this.hud.updateCounter('hp', health.current);

    if (health.isDead) {
      this.onPlayerDeath();
    }
  }

  private onPlayerDeath(): void {
    this.isGameOver = true;
    this.audio.proceduralMusic.stop(1000);
    this.audio.procedural.gameOver();
    Toast.show(this, { message: `Game Over! Score: ${this.score}`, position: 'center', duration: 5000 });
    ConsoleReporter.state('game over', { score: this.score });
  }

  private onEnemyKill(event: DamageEvent): void {
    const ex = event.target.x;
    const ey = event.target.y;

    this.enemyPool.release(event.target);
    this.squad.removeMember(event.target);

    this.combo++;
    this.comboTimer = 2500;
    const points = 10 * this.combo;
    this.score += points;

    this.gpuParticles.burst(12 + this.combo * 2, ex, ey);
    this.particles.explode(ex, ey, 0xff4444, { comboMultiplier: this.combo });
    ScorePopup.score(this, ex, ey - 15, points, this.combo);
    this.audio.procedural.merge(this.combo);

    if (this.combo >= 2) {
      this.comboDisplay.show(this.combo, { color: 0xff8800 });
      SceneUtils.comboShake(this, this.combo);
    }

    this.hud.updateCounter('score', this.score);
    ConsoleReporter.state(`kill ${event.target.entityType}, score: ${this.score}, combo: ${this.combo}`);
  }
}
