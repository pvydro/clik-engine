import {
  BaseScene, ConsoleReporter, Toast,
  GraphicsParticles, ScorePopup, AnimatedHUD,
  GameFeelPresets, SceneUtils,
  Entity, EntityFactory, EntityPool,
  Movement, Health, Hitbox, Hurtbox, CullOffscreen, Lifetime,
  CombatManager,
  BulletEmitter,
  HierarchicalStateMachine,
  DynamicZoom,
  EffectComposer,
  BeatSync,
  ForceField,
  ColorGrading, ColorGradingPresets,
  GPUParticleEmitter, CombatParticlePresets,
} from 'clik-engine';
import type { DamageEvent } from 'clik-engine';
import Phaser from 'phaser';

// ── Constants ──────────────────────────────────────────────────────
const ARENA_CX = 640;
const ARENA_CY = 400;
const ARENA_RADIUS = 300;
const BOSS_HP = 300;
const PLAYER_HP = 8;

// ── Boss AI context ────────────────────────────────────────────────
interface BossContext {
  boss: Entity;
  player: Entity;
  scene: GameScene;
  phase: number;
  attackTimer: number;
}

export class GameScene extends BaseScene {
  // Entities
  private player!: Entity;
  private boss!: Entity;
  private bossEye!: Phaser.GameObjects.Graphics;
  private bossHpBar!: Phaser.GameObjects.Graphics;
  private bossHpBg!: Phaser.GameObjects.Graphics;

  // Pools & factory
  private factory!: EntityFactory;
  private bulletPool!: EntityPool;

  // Systems
  private combat!: CombatManager;
  private bossFSM!: HierarchicalStateMachine<BossContext>;
  private dynamicZoom!: DynamicZoom;
  private effectComposer!: EffectComposer;
  private beatSync!: BeatSync;
  private forceField!: ForceField;
  private colorGrading!: ColorGrading;
  private gpuParticles!: GPUParticleEmitter;
  private particles!: GraphicsParticles;
  private hud!: AnimatedHUD;

  // State
  private bossPhase = 1;
  private isGameOver = false;
  private restartPending = false;
  private dodgeCooldown = 0;
  private isDodging = false;
  private dodgeTimer = 0;
  private attackCooldown = 0;
  private phaseColors = [0x6633aa, 0xaa3333, 0x33aa33];

  // Arena floor tiles
  private floorTiles: { x: number; y: number; rect: Phaser.GameObjects.Rectangle; alive: boolean }[] = [];

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    // Reset state for scene restart
    this.isGameOver = false;
    this.restartPending = false;
    this.bossPhase = 1;
    this.dodgeCooldown = 0;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.attackCooldown = 0;
    this.floorTiles = [];

    // Force input system initialization (needed after scene restart)
    void this.actions;

    this.cameras.main.setBackgroundColor('#0a0008');
    this.cameras.main.fadeIn(500);

    if (this.physics?.world) {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
    }

    // ── Systems ──────────────────────────────────────────────────
    this.particles = new GraphicsParticles(this);
    this.entities.enableSpatial({ cellSize: 64 });

    this.dynamicZoom = new DynamicZoom(this, { minZoom: 0.7, maxZoom: 1.0, padding: 200, smoothing: 0.03 });
    this.effectComposer = new EffectComposer(this);
    this.beatSync = new BeatSync({ bpm: 90 });
    this.forceField = new ForceField({ type: 'vortex', x: ARENA_CX, y: ARENA_CY, strength: 0, radius: 250 });
    this.colorGrading = new ColorGrading(this);
    this.colorGrading.apply(ColorGradingPresets.normal);

    this.gpuParticles = new GPUParticleEmitter(this, {
      maxParticles: 3000, lifetime: 500, rate: 0,
      speedMin: 80, speedMax: 300, sizeMin: 1, sizeMax: 4, gravity: 50,
      color: 0x6633aa, fadeOut: true,
    });
    this.gpuParticles.start();

    // ── Arena ────────────────────────────────────────────────────
    this.buildArena();

    // ── Entity factory + pools ──────────────────────────────────
    this.factory = new EntityFactory().useRegistry(this.entities);

    this.bulletPool = new EntityPool(this.factory, this, { prefabName: 'boss-bullet', maxSize: 100 });
    this.bulletPool.useRegistry(this.entities);

    this.factory.register('boss-bullet', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'boss-bullet';
      const rect = scene.add.rectangle(0, 0, 6, 6, this.phaseColors[this.bossPhase - 1]);
      e.add(rect);
      e.addComponent('movement', new Movement(200));
      e.addComponent('hitbox', new Hitbox([
        { offsetX: -3, offsetY: -3, width: 6, height: 6, damageAmount: 1, damageType: 'physical' },
      ]));
      e.addComponent('cull', new CullOffscreen(100).usePool(this.bulletPool));
      e.addComponent('lifetime', new Lifetime(4000));
      e.addTag('spatial');
      return e;
    });

    this.bulletPool.prewarm(20);

    // ── Player ──────────────────────────────────────────────────
    this.createPlayer();

    // ── Boss ────────────────────────────────────────────────────
    this.createBoss();

    // ── Combat ──────────────────────────────────────────────────
    this.combat = new CombatManager(this.entities);
    this.combat.setFilter((attacker, defender) => {
      // Boss bullets and boss body hit player only
      if (attacker.entityType === 'boss-bullet' || attacker.entityType === 'boss') {
        return defender.entityType === 'player';
      }
      // Player hits boss only
      if (attacker.entityType === 'player') return defender.entityType === 'boss';
      return false;
    });
    this.combat.onDamage((event: DamageEvent) => {
      if (event.target === this.player) this.onPlayerHit(event);
      if (event.target === this.boss) this.onBossHit(event);
    });
    this.combat.onKill((event: DamageEvent) => {
      if (event.target === this.boss) this.onBossDefeated();
    });

    // ── Boss AI ─────────────────────────────────────────────────
    this.setupBossAI();

    // ── Dynamic zoom ────────────────────────────────────────────
    this.dynamicZoom.addTarget(this.player, 1);
    this.dynamicZoom.addTarget(this.boss, 1.5);

    // ── Beat sync ───────────────────────────────────────────────
    this.beatSync.onBeat(() => {
      if (this.isGameOver) return;
      // Pulse boss outline
      const bossGfx = this.boss.list[0] as Phaser.GameObjects.Graphics;
      if (bossGfx) {
        this.tweens.add({ targets: bossGfx, alpha: 0.7, duration: 50, yoyo: true });
      }
    });
    this.beatSync.onMeasure(() => {
      if (this.isGameOver) return;
      // Boss attacks are triggered by FSM, but measure gives rhythmic pulse
      this.bossFSM.sendEvent({ type: 'measure' });
    });
    this.beatSync.start();

    // ── HUD ─────────────────────────────────────────────────────
    this.hud = new AnimatedHUD(this);
    this.hud.addCounter('hp', { label: 'HP', x: 60, y: 30, color: 0x00ffcc });
    this.hud.updateCounter('hp', PLAYER_HP);

    // Boss HP bar
    this.bossHpBg = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.bossHpBar = this.add.graphics().setScrollFactor(0).setDepth(51);
    this.drawBossHpBar();

    // Phase label
    this.add.text(width / 2, 16, 'THE SENTINEL', {
      fontSize: '14px', fontFamily: 'monospace', color: '#664488',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50);

    this.add.text(width / 2, height - 16, 'WASD move | X/Click attack | Space dodge', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5).setScrollFactor(0);

    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.5);

    this.inspectState('boss-fight', () => ({
      playerHP: this.player.getComponent<Health>('health')?.current,
      bossHP: this.boss.getComponent<Health>('health')?.current,
      phase: this.bossPhase,
      bossState: this.bossFSM.getStatePath(),
      beat: this.beatSync.getTotalBeats(),
    }));

    ConsoleReporter.scene('Boss Fight ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.isGameOver) {
      if (this.restartPending) {
        this.scene.restart();
      }
      return;
    }

    const dt = delta / 1000;

    // ── Player movement ─────────────────────────────────────────
    this.handlePlayerMovement(dt);

    // ── Dodge ───────────────────────────────────────────────────
    this.dodgeCooldown -= delta;
    if (this.isDodging) {
      this.dodgeTimer -= delta;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        const hurtbox = this.player.getComponent<Hurtbox>('hurtbox')!;
        // Iframes end naturally via Hurtbox
      }
    }
    if (this.actions.justPressed('dodge') && this.dodgeCooldown <= 0 && !this.isDodging) {
      this.performDodge();
    }

    // ── Attack ──────────────────────────────────────────────────
    this.attackCooldown -= delta;
    if (this.actions.justPressed('attack') && this.attackCooldown <= 0) {
      this.performAttack();
    }

    // ── Boss eye tracking ───────────────────────────────────────
    this.updateBossEye();

    // ── Systems update ──────────────────────────────────────────
    this.bossFSM.update(delta);
    this.combat.update();
    this.dynamicZoom.update();
    this.beatSync.update(delta);
    this.gpuParticles.update(delta);

    // ── Force field (phase 3 only) — pull player toward boss ────
    if (this.bossPhase === 3 && this.forceField.enabled) {
      this.forceField.setPosition(this.boss.x, this.boss.y);
      const target = { x: this.player.x, y: this.player.y, vx: 0, vy: 0 };
      this.forceField.apply(target, delta);
      this.player.x += target.vx * dt;
      this.player.y += target.vy * dt;
    }

    // Clamp boss to arena
    const bdx = this.boss.x - ARENA_CX;
    const bdy = this.boss.y - ARENA_CY;
    const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
    if (bdist > ARENA_RADIUS - 34) {
      const ba = Math.atan2(bdy, bdx);
      this.boss.x = ARENA_CX + Math.cos(ba) * (ARENA_RADIUS - 34);
      this.boss.y = ARENA_CY + Math.sin(ba) * (ARENA_RADIUS - 34);
    }

    this.drawBossHpBar();
  }

  // ── Arena ──────────────────────────────────────────────────────

  private buildArena(): void {
    const g = this.add.graphics();
    // Outer arena ring
    g.lineStyle(2, 0x331133);
    g.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS);
    g.lineStyle(1, 0x220022);
    g.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS * 0.7);

    // Floor tiles (for phase 3 destruction)
    const tileSize = 40;
    const halfArena = ARENA_RADIUS - 20;
    for (let x = ARENA_CX - halfArena; x < ARENA_CX + halfArena; x += tileSize) {
      for (let y = ARENA_CY - halfArena; y < ARENA_CY + halfArena; y += tileSize) {
        // Only within circle
        const dx = x + tileSize / 2 - ARENA_CX;
        const dy = y + tileSize / 2 - ARENA_CY;
        if (Math.sqrt(dx * dx + dy * dy) > halfArena) continue;

        const rect = this.add.rectangle(x + tileSize / 2, y + tileSize / 2, tileSize - 2, tileSize - 2, 0x110011, 0.3);
        rect.setDepth(0);
        this.floorTiles.push({ x: x + tileSize / 2, y: y + tileSize / 2, rect, alive: true });
      }
    }
  }

  // ── Player ─────────────────────────────────────────────────────

  private createPlayer(): void {
    this.player = new Entity(this, ARENA_CX, ARENA_CY + 200);
    this.player.entityType = 'player';

    const body = this.add.graphics();
    body.fillStyle(0x00ffcc, 1);
    body.fillRect(-8, -8, 16, 16);
    body.lineStyle(1, 0x00ffcc, 0.4);
    body.strokeRect(-10, -10, 20, 20);
    this.player.add(body);
    this.player.setDepth(10);

    this.player.addComponent('movement', new Movement(300));
    this.player.addComponent('health', new Health(PLAYER_HP));
    this.player.addComponent('hurtbox', new Hurtbox([
      { offsetX: -8, offsetY: -8, width: 16, height: 16 },
    ]));
    // Hitbox only active during attack
    this.player.addComponent('hitbox', new Hitbox([
      { offsetX: -36, offsetY: -36, width: 72, height: 72, damageAmount: 15, damageType: 'physical', tag: 'attack' },
    ]));
    this.player.getComponent<Hitbox>('hitbox')!.disableByTag('attack');
    this.player.addTag('spatial');
    this.entities.register(this.player);
  }

  private handlePlayerMovement(dt: number): void {
    const speed = this.isDodging ? 500 : 300;
    let vx = 0, vy = 0;
    if (this.actions.isDown('move_left')) vx = -1;
    if (this.actions.isDown('move_right')) vx = 1;
    if (this.actions.isDown('move_up')) vy = -1;
    if (this.actions.isDown('move_down')) vy = 1;

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      this.player.x += (vx / len) * speed * dt;
      this.player.y += (vy / len) * speed * dt;
    }

    // Clamp to arena
    const dx = this.player.x - ARENA_CX;
    const dy = this.player.y - ARENA_CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ARENA_RADIUS - 12) {
      const a = Math.atan2(dy, dx);
      this.player.x = ARENA_CX + Math.cos(a) * (ARENA_RADIUS - 12);
      this.player.y = ARENA_CY + Math.sin(a) * (ARENA_RADIUS - 12);
    }
  }

  private performDodge(): void {
    this.isDodging = true;
    this.dodgeTimer = 200;
    this.dodgeCooldown = 600;
    const hurtbox = this.player.getComponent<Hurtbox>('hurtbox')!;
    hurtbox.triggerIframes(250);

    // Visual flash
    const body = this.player.list[0] as Phaser.GameObjects.Graphics;
    if (body) {
      this.tweens.add({ targets: body, alpha: 0.3, duration: 100, yoyo: true, repeat: 1 });
    }
    this.gpuParticles.burst(8, this.player.x, this.player.y);
    this.audio.procedural.tone({ frequency: 300, type: 'sine', duration: 0.05, volume: 0.08 });
  }

  private performAttack(): void {
    this.attackCooldown = 400;
    const hitbox = this.player.getComponent<Hitbox>('hitbox')!;
    hitbox.enableByTag('attack');

    // Disable hitbox after one frame so it only hits once per attack
    this.time.delayedCall(32, () => {
      hitbox.disableByTag('attack');
    });

    // Brief flash of attack area (visual only)
    const atkGfx = this.add.graphics();
    atkGfx.fillStyle(0x00ffcc, 0.2);
    atkGfx.fillCircle(this.player.x, this.player.y, 20);
    atkGfx.setDepth(9);
    this.tweens.add({
      targets: atkGfx, alpha: 0, duration: 150,
      onComplete: () => atkGfx.destroy(),
    });
    this.audio.procedural.tone({ frequency: 500, type: 'square', duration: 0.04, volume: 0.06 });
  }

  // ── Boss ───────────────────────────────────────────────────────

  private createBoss(): void {
    this.boss = new Entity(this, ARENA_CX, ARENA_CY);
    this.boss.entityType = 'boss';

    const body = this.add.graphics();
    body.fillStyle(0x6633aa);
    body.fillRect(-32, -32, 64, 64);
    body.lineStyle(2, 0x9966dd);
    body.strokeRect(-32, -32, 64, 64);
    this.boss.add(body);
    this.boss.setDepth(8);

    // Eye (separate graphics for tracking)
    this.bossEye = this.add.graphics();
    this.bossEye.setDepth(9);
    this.updateBossEye();

    this.boss.addComponent('health', new Health(BOSS_HP));
    this.boss.addComponent('movement', new Movement(60));
    this.boss.addComponent('hurtbox', new Hurtbox([
      { offsetX: -32, offsetY: -32, width: 64, height: 64 },
    ]));
    this.boss.addComponent('hitbox', new Hitbox([
      { offsetX: -32, offsetY: -32, width: 64, height: 64, damageAmount: 2, damageType: 'physical', tag: 'body' },
    ]));
    this.boss.addTag('spatial');
    this.entities.register(this.boss);
  }

  private updateBossEye(): void {
    this.bossEye.clear();
    const angle = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
    const eyeOffset = 10;
    const eyeX = this.boss.x + Math.cos(angle) * eyeOffset;
    const eyeY = this.boss.y + Math.sin(angle) * eyeOffset;

    this.bossEye.fillStyle(0xff4444);
    this.bossEye.fillCircle(eyeX, eyeY, 6);
    this.bossEye.fillStyle(0xffffff);
    this.bossEye.fillCircle(eyeX + Math.cos(angle) * 2, eyeY + Math.sin(angle) * 2, 2);
  }

  private drawBossHpBar(): void {
    const w = 300;
    const h = 8;
    const x = (this.scale.width - w) / 2;
    const y = 35;

    const health = this.boss.getComponent<Health>('health');
    if (!health) return;
    const ratio = health.current / health.max;

    this.bossHpBg.clear();
    this.bossHpBg.fillStyle(0x222222);
    this.bossHpBg.fillRect(x, y, w, h);

    this.bossHpBar.clear();
    const color = this.phaseColors[this.bossPhase - 1];
    this.bossHpBar.fillStyle(color);
    this.bossHpBar.fillRect(x, y, w * ratio, h);

    // Phase markers
    this.bossHpBg.lineStyle(1, 0x444444);
    this.bossHpBg.lineBetween(x + w * 0.6, y, x + w * 0.6, y + h);
    this.bossHpBg.lineBetween(x + w * 0.25, y, x + w * 0.25, y + h);
  }

  // ── Boss AI ────────────────────────────────────────────────────

  private setupBossAI(): void {
    const ctx: BossContext = {
      boss: this.boss,
      player: this.player,
      scene: this,
      phase: 1,
      attackTimer: 0,
    };

    this.bossFSM = new HierarchicalStateMachine<BossContext>(ctx, 'boss');

    // ── Phase 1: Slow, radial bursts ────────────────────────────
    const phase1FSM = new HierarchicalStateMachine<BossContext>(ctx, 'phase1');
    phase1FSM.addState('idle', {
      hooks: {
        update: (c, delta) => {
          c.attackTimer += delta;
        },
      },
    });
    phase1FSM.addState('radial_burst', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          this.bossFireRadial(8, 200);
          this.audio.procedural.tone({ frequency: 200, type: 'sawtooth', duration: 0.15, volume: 0.1 });
        },
      },
    });
    phase1FSM.addState('slam', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          // Move toward player briefly
          const mov = c.boss.getComponent<Movement>('movement')!;
          mov.moveToward(c.player.x, c.player.y);
          this.cameras.main.shake(200, 0.01);
        },
        update: (c, delta) => {
          c.attackTimer += delta;
        },
        exit: (c) => {
          c.boss.getComponent<Movement>('movement')!.stop();
        },
      },
    });
    phase1FSM.addTransition('idle', 'radial_burst', (c) => c.attackTimer > 2000);
    phase1FSM.addTimeoutTransition('radial_burst', { to: 'idle', durationMs: 500 });
    phase1FSM.addTransition('idle', 'slam', (c) => {
      const dx = c.player.x - c.boss.x;
      const dy = c.player.y - c.boss.y;
      return Math.sqrt(dx * dx + dy * dy) < 150 && c.attackTimer > 1000;
    });
    phase1FSM.addTimeoutTransition('slam', { to: 'idle', durationMs: 800 });

    // ── Phase 2: Faster, spiral + chase ─────────────────────────
    const phase2FSM = new HierarchicalStateMachine<BossContext>(ctx, 'phase2');
    phase2FSM.addState('idle', {
      hooks: {
        update: (c, delta) => { c.attackTimer += delta; },
      },
    });
    phase2FSM.addState('spiral', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          this.bossFireSpiral(4, 180);
          this.audio.procedural.tone({ frequency: 300, type: 'sawtooth', duration: 0.2, volume: 0.1 });
        },
      },
    });
    phase2FSM.addState('chase', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          const mov = c.boss.getComponent<Movement>('movement')!;
          mov.speed = 120;
          mov.moveToward(c.player.x, c.player.y);
        },
        update: (c, delta) => {
          c.attackTimer += delta;
          c.boss.getComponent<Movement>('movement')!.moveToward(c.player.x, c.player.y);
        },
        exit: (c) => {
          c.boss.getComponent<Movement>('movement')!.stop();
          c.boss.getComponent<Movement>('movement')!.speed = 60;
        },
      },
    });
    phase2FSM.addTransition('idle', 'spiral', (c) => c.attackTimer > 1500);
    phase2FSM.addTimeoutTransition('spiral', { to: 'chase', durationMs: 400 });
    phase2FSM.addTimeoutTransition('chase', { to: 'idle', durationMs: 2000 });

    // ── Phase 3: Vortex + floor break + frenzy ──────────────────
    const phase3FSM = new HierarchicalStateMachine<BossContext>(ctx, 'phase3');
    phase3FSM.addState('idle', {
      hooks: {
        update: (c, delta) => { c.attackTimer += delta; },
      },
    });
    phase3FSM.addState('vortex', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          this.forceField.setStrength(300);
          this.forceField.enabled = true;
          this.audio.procedural.tone({ frequency: 100, type: 'sine', duration: 0.5, volume: 0.15 });
        },
        exit: () => {
          this.forceField.setStrength(0);
          this.forceField.enabled = false;
        },
      },
    });
    phase3FSM.addState('floor_break', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          this.destroyFloorTiles(5);
          this.cameras.main.shake(400, 0.02);
          this.audio.procedural.explosion();
        },
      },
    });
    phase3FSM.addState('frenzy', {
      hooks: {
        enter: (c) => {
          c.attackTimer = 0;
          // Rapid bullets
          this.bossFireRadial(12, 250);
          this.bossFireSpiral(6, 300);
        },
        update: (c, delta) => {
          c.attackTimer += delta;
          if (c.attackTimer > 500) {
            c.attackTimer = 0;
            this.bossFireRadial(8, 220);
          }
        },
      },
    });
    phase3FSM.addTransition('idle', 'vortex', (c) => c.attackTimer > 1200);
    phase3FSM.addTimeoutTransition('vortex', { to: 'floor_break', durationMs: 2000 });
    phase3FSM.addTimeoutTransition('floor_break', { to: 'frenzy', durationMs: 500 });
    phase3FSM.addTimeoutTransition('frenzy', { to: 'idle', durationMs: 2500 });

    // ── Top-level FSM ───────────────────────────────────────────
    this.bossFSM.addState('phase1', {
      hooks: {
        enter: () => {
          this.bossPhase = 1;
          this.beatSync.setBPM(90);
          this.colorGrading.apply(ColorGradingPresets.normal);
          ConsoleReporter.state('Boss phase 1');
        },
      },
      children: phase1FSM,
      initialChild: 'idle',
    });

    this.bossFSM.addState('phase2', {
      hooks: {
        enter: () => {
          this.bossPhase = 2;
          this.beatSync.setBPM(120);
          this.colorGrading.transitionTo(ColorGradingPresets.desaturated, 500);
          this.triggerPhaseTransition();
          this.redrawBoss(0xaa3333, 0xdd5555);
          ConsoleReporter.state('Boss phase 2');
        },
      },
      children: phase2FSM,
      initialChild: 'idle',
    });

    this.bossFSM.addState('phase3', {
      hooks: {
        enter: () => {
          this.bossPhase = 3;
          this.boss.getComponent<Movement>('movement')?.stop();
          this.beatSync.setBPM(150);
          this.colorGrading.transitionTo(ColorGradingPresets.toxic, 500);
          this.triggerPhaseTransition();
          this.redrawBoss(0x33aa33, 0x66dd66);
          this.audio.proceduralMusic.setIntensity(1);
          ConsoleReporter.state('Boss phase 3');
        },
      },
      children: phase3FSM,
      initialChild: 'idle',
    });

    this.bossFSM.addState('defeated', {
      hooks: {
        enter: () => {
          ConsoleReporter.state('Boss defeated!');
        },
      },
    });

    // Phase transitions based on HP
    const bossHealth = this.boss.getComponent<Health>('health')!;
    this.bossFSM.addTransition('phase1', 'phase2', () => bossHealth.ratio <= 0.6);
    this.bossFSM.addTransition('phase2', 'phase3', () => bossHealth.ratio <= 0.25);
    this.bossFSM.addTransition('phase3', 'defeated', () => bossHealth.isDead);

    this.bossFSM.start('phase1');
  }

  // ── Boss attacks ───────────────────────────────────────────────

  private bossFireRadial(count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const bullet = this.bulletPool.acquire(this.boss.x, this.boss.y);
      if (!bullet) break;
      bullet.addTag('spatial');
      const mov = bullet.getComponent<Movement>('movement')!;
      mov.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  private bossFireSpiral(count: number, speed: number): void {
    const baseAngle = Date.now() * 0.003;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / count;
      const bullet = this.bulletPool.acquire(this.boss.x, this.boss.y);
      if (!bullet) break;
      bullet.addTag('spatial');
      const mov = bullet.getComponent<Movement>('movement')!;
      mov.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  private triggerPhaseTransition(): void {
    const playerHealth = this.player.getComponent<Health>('health');
    if (this.isGameOver || playerHealth?.isDead) return;
    this.effectComposer.play('heavyImpact', this.boss.x, this.boss.y);
    this.gpuParticles.burst(50, this.boss.x, this.boss.y);
    Toast.show(this, { message: `Phase ${this.bossPhase}`, position: 'center', duration: 1500 });
    this.audio.procedural.explosion();
  }

  private redrawBoss(fill: number, stroke: number): void {
    const body = this.boss.list[0] as Phaser.GameObjects.Graphics;
    if (body) {
      body.clear();
      body.fillStyle(fill);
      body.fillRect(-32, -32, 64, 64);
      body.lineStyle(2, stroke);
      body.strokeRect(-32, -32, 64, 64);
    }
  }

  private destroyFloorTiles(count: number): void {
    const alive = this.floorTiles.filter(t => t.alive);
    // Destroy tiles near boss
    const sorted = alive.sort((a, b) => {
      const da = Math.hypot(a.x - this.boss.x, a.y - this.boss.y);
      const db = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
      return da - db;
    });
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const tile = sorted[i];
      tile.alive = false;
      this.particles.explode(tile.x, tile.y, 0x110011, { count: 5 });
      this.tweens.add({
        targets: tile.rect, alpha: 0, duration: 300,
        onComplete: () => tile.rect.destroy(),
      });
    }
  }

  // ── Combat events ──────────────────────────────────────────────

  private onPlayerHit(event: DamageEvent): void {
    if (this.isDodging) return;
    if (this.isGameOver) return;
    const health = this.player.getComponent<Health>('health')!;

    if (event.source?.entityType === 'boss-bullet') {
      this.bulletPool.release(event.source);
    }

    const hurtbox = this.player.getComponent<Hurtbox>('hurtbox')!;
    hurtbox.triggerIframes(1000);

    this.particles.impact(this.player.x, this.player.y, 0x00ffcc, 2);
    SceneUtils.screenFlash(this, 0xff0000, 200);
    SceneUtils.hitStop(this, 40);
    this.audio.procedural.explosion();
    this.hud.updateCounter('hp', health.current);

    if (health.isDead) {
      this.isGameOver = true;
      this.boss.getComponent<Movement>('movement')?.stop();
      this.beatSync.stop();
      this.effectComposer.play('death');
      this.audio.proceduralMusic.stop(1000);
      this.audio.procedural.gameOver();
      Toast.dismissAll(this);
      Toast.show(this, { message: 'DEFEATED — Press any key to retry', position: 'center', duration: 99999 });
      setTimeout(() => {
        this.game.canvas.addEventListener('pointerdown', () => { this.restartPending = true; }, { once: true });
        document.addEventListener('keydown', () => { this.restartPending = true; }, { once: true });
      }, 500);
    }
  }

  private onBossHit(event: DamageEvent): void {
    // Disable player hitbox immediately so one attack = one hit
    const playerHitbox = this.player.getComponent<Hitbox>('hitbox');
    if (playerHitbox) playerHitbox.disableByTag('attack');

    this.gpuParticles.burst(10, this.boss.x, this.boss.y);
    ScorePopup.score(this, this.boss.x, this.boss.y - 40, event.amount);
    this.audio.procedural.tone({ frequency: 150, type: 'sine', duration: 0.06, volume: 0.08 });

    // Camera feedback
    this.cameras.main.shake(100, 0.005);
  }

  private onBossDefeated(): void {
    this.isGameOver = true;
    this.beatSync.stop();
    this.effectComposer.play('death');
    this.gpuParticles.burst(100, this.boss.x, this.boss.y);
    this.particles.explode(this.boss.x, this.boss.y, this.phaseColors[this.bossPhase - 1], { count: 30 });
    this.boss.setAlpha(0);
    this.bossEye.clear();
    this.audio.proceduralMusic.stop(2000);
    this.audio.procedural.chain(10);

    this.time.delayedCall(1000, () => {
      Toast.dismissAll(this);
      Toast.show(this, { message: 'VICTORY! — Press any key to replay', position: 'center', duration: 99999 });
      this.game.canvas.addEventListener('pointerdown', () => { this.restartPending = true; }, { once: true });
      document.addEventListener('keydown', () => { this.restartPending = true; }, { once: true });
    });
    ConsoleReporter.state('Boss defeated! Victory!');
  }
}
