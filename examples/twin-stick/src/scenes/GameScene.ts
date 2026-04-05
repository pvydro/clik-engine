import {
  BaseScene, ConsoleReporter, Toast,
  GraphicsParticles, ScorePopup, ComboDisplay, AnimatedHUD,
  GameFeelPresets, SceneUtils,
  Entity, EntityFactory, EntityPool,
  Movement, Health, Hitbox, Hurtbox, CullOffscreen, Lifetime,
  CombatManager,
  BulletEmitter,
  WaveManager,
  DirectorAI,
  DynamicZoom,
  EffectComposer,
  TimeEffects,
  SpatialAudio,
  GPUParticleEmitter, CombatParticlePresets,
} from 'clik-engine';
import type { DamageEvent, PatternConfig, BulletConfig } from 'clik-engine';
import Phaser from 'phaser';

// ── Weapon definitions ─────────────────────────────────────────────
interface WeaponDef {
  name: string;
  pattern: PatternConfig;
  bullet: BulletConfig;
  color: number;
}

const WEAPONS: WeaponDef[] = [
  {
    name: 'MACHINEGUN',
    pattern: { type: 'aimed', count: 1, fireRateMs: 100 },
    bullet: { speed: 600 },
    color: 0xffff00,
  },
  {
    name: 'SHOTGUN',
    pattern: { type: 'shotgun', count: 5, angleSpread: 0.5, fireRateMs: 450 },
    bullet: { speed: 450 },
    color: 0xff8800,
  },
  {
    name: 'SPIRAL',
    pattern: { type: 'spiral', count: 3, rotationRate: 4, fireRateMs: 120 },
    bullet: { speed: 400 },
    color: 0x88ffff,
  },
];

// ── Arena constants ────────────────────────────────────────────────
const ARENA_RADIUS = 380;
const ARENA_CX = 640;
const ARENA_CY = 400;

export class GameScene extends BaseScene {
  // Player
  private player!: Entity;
  private playerAimLine!: Phaser.GameObjects.Graphics;

  // Pools & factory
  private factory!: EntityFactory;
  private bulletPool!: EntityPool;
  private enemyPool!: EntityPool;
  private enemyBulletPool!: EntityPool;

  // Systems
  private combat!: CombatManager;
  private waveManager!: WaveManager;
  private directorAI!: DirectorAI;
  private dynamicZoom!: DynamicZoom;
  private effectComposer!: EffectComposer;
  private timeEffects!: TimeEffects;
  private spatialAudio!: SpatialAudio;
  private gpuParticles!: GPUParticleEmitter;
  private particles!: GraphicsParticles;
  private comboDisplay!: ComboDisplay;
  private hud!: AnimatedHUD;

  // State
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private readonly COMBO_WINDOW = 2500;
  private weaponIndex = 0;
  private slowmoCooldown = 0;
  private isGameOver = false;
  private weaponSwitchCooldown = 0;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a1a');

    if (this.physics?.world) {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
    }

    // ── Systems ──────────────────────────────────────────────────
    this.particles = new GraphicsParticles(this);
    this.comboDisplay = new ComboDisplay(this, { particles: this.particles, y: 60 });
    this.entities.enableSpatial({ cellSize: 64 });

    this.directorAI = new DirectorAI({ targetIntensity: 0.6 });
    this.dynamicZoom = new DynamicZoom(this, { minZoom: 0.6, maxZoom: 1.2, padding: 150, smoothing: 0.04 });
    this.effectComposer = new EffectComposer(this);
    this.timeEffects = new TimeEffects(this);
    this.spatialAudio = new SpatialAudio(this, { maxDistance: 600 });

    this.gpuParticles = new GPUParticleEmitter(this, {
      maxParticles: 5000,
      lifetime: 400,
      rate: 0,
      speedMin: 100,
      speedMax: 400,
      sizeMin: 1,
      sizeMax: 4,
      gravity: 100,
      color: 0xff6600,
      fadeOut: true,
    });
    this.gpuParticles.start();

    // ── Arena ────────────────────────────────────────────────────
    this.buildArena();

    // ── Entity factory + prefabs ────────────────────────────────
    this.factory = new EntityFactory().useRegistry(this.entities);

    this.bulletPool = new EntityPool(this.factory, this, { prefabName: 'bullet', maxSize: 200 });
    this.bulletPool.useRegistry(this.entities);
    this.enemyPool = new EntityPool(this.factory, this, { prefabName: 'enemy', maxSize: 60 });
    this.enemyPool.useRegistry(this.entities);
    this.enemyBulletPool = new EntityPool(this.factory, this, { prefabName: 'enemy-bullet', maxSize: 80 });
    this.enemyBulletPool.useRegistry(this.entities);

    this.registerPrefabs();

    this.bulletPool.prewarm(30);
    this.enemyBulletPool.prewarm(10);

    // ── Player ──────────────────────────────────────────────────
    this.createPlayer();

    // ── Combat ──────────────────────────────────────────────────
    this.combat = new CombatManager(this.entities);

    // Filter: player bullets only hit enemies, enemy bullets/bodies only hit player
    this.combat.setFilter((attacker, defender) => {
      // Player bullets -> enemies only
      if (attacker.entityType === 'bullet') return defender.entityType !== 'player' && defender.entityType !== 'bullet';
      // Enemy bullets -> player only
      if (attacker.entityType === 'enemy-bullet') return defender.entityType === 'player';
      // Enemy bodies -> player only
      return defender.entityType === 'player';
    });

    this.combat.onDamage((event: DamageEvent) => {
      if (event.target === this.player) {
        this.onPlayerHit(event);
      }
    });
    this.combat.onKill((event: DamageEvent) => {
      if (event.target !== this.player) {
        this.onEnemyKill(event);
      }
    });

    // ── Waves ───────────────────────────────────────────────────
    this.setupWaves();

    // ── Dynamic zoom ────────────────────────────────────────────
    this.dynamicZoom.addTarget(this.player, 2);

    // ── Spatial audio listener ──────────────────────────────────
    this.spatialAudio.setListener(this.player);

    // ── HUD ─────────────────────────────────────────────────────
    this.hud = new AnimatedHUD(this);
    this.hud.addCounter('score', { label: 'SCORE', x: 60, y: 30, color: 0x00ffcc });
    this.hud.addCounter('hp', { label: 'HP', x: width - 60, y: 30, color: 0xff6666, warningThreshold: 3, warningColor: 0xff0000 });
    this.hud.addCounter('wave', { label: 'WAVE', x: width / 2, y: 30, color: 0xffcc00 });
    this.hud.updateCounter('hp', 10);
    this.hud.updateCounter('wave', 1);

    // Weapon label
    this.add.text(width / 2, height - 20, 'WASD move | Click/Space shoot | E/Q weapon | Shift slow-mo', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5).setScrollFactor(0);

    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.3);

    this.inspectState('twin-stick', () => ({
      score: this.score,
      wave: this.waveManager.currentWaveIndex + 1,
      enemies: this.waveManager.enemiesRemaining,
      weapon: WEAPONS[this.weaponIndex].name,
      combo: this.combo,
      intensity: Math.round(this.directorAI.getIntensity() * 100),
    }));

    ConsoleReporter.scene('Twin-Stick Shooter ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.isGameOver) return;

    const dt = delta / 1000;

    // ── Player movement ─────────────────────────────────────────
    this.handlePlayerMovement(dt);

    // ── Aim line ────────────────────────────────────────────────
    this.updateAimLine();

    // ── Shooting ────────────────────────────────────────────────
    const emitter = this.player.getComponent<BulletEmitter>('emitter')!;
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    emitter.setTarget(worldPoint);
    emitter.update(delta);

    if (this.actions.isDown('shoot')) {
      const fired = emitter.fire();
      if (fired.length > 0) {
        this.audio.procedural.tone({ frequency: 600 + this.weaponIndex * 200, type: 'sine', duration: 0.03, volume: 0.08 });
      }
    }

    // ── Weapon switching ────────────────────────────────────────
    this.weaponSwitchCooldown -= delta;
    if (this.weaponSwitchCooldown <= 0) {
      if (this.actions.justPressed('weapon_next')) {
        this.switchWeapon(1);
        this.weaponSwitchCooldown = 200;
      } else if (this.actions.justPressed('weapon_prev')) {
        this.switchWeapon(-1);
        this.weaponSwitchCooldown = 200;
      }
    }

    // ── Slow-mo ─────────────────────────────────────────────────
    this.slowmoCooldown -= delta;
    if (this.actions.justPressed('slowmo') && this.slowmoCooldown <= 0) {
      this.timeEffects.slowMo(0.3, 1500, 'gradual');
      this.effectComposer.play('dashBurst', this.player.x, this.player.y);
      this.slowmoCooldown = 5000;
      this.audio.procedural.tone({ frequency: 200, type: 'sine', duration: 0.2, volume: 0.15 });
    }

    // ── Combo decay ─────────────────────────────────────────────
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // ── Enemy AI ────────────────────────────────────────────────
    this.updateEnemies(dt);

    // ── Systems update ──────────────────────────────────────────
    this.combat.update();
    this.waveManager.update(delta);
    this.directorAI.update(delta);

    this.dynamicZoom.update();
    this.gpuParticles.update(delta);

    // ── Music intensity ─────────────────────────────────────────
    this.audio.proceduralMusic.setIntensity(Math.min(1, 0.3 + this.directorAI.getIntensity() * 0.7));
  }

  // ── Arena ──────────────────────────────────────────────────────

  private buildArena(): void {
    const g = this.add.graphics();
    // Arena border circle
    g.lineStyle(2, 0x334466);
    g.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS);

    // Inner ring decorations
    g.lineStyle(1, 0x1a2233);
    g.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS * 0.6);
    g.strokeCircle(ARENA_CX, ARENA_CY, ARENA_RADIUS * 0.3);

    // Cross-hatch lines
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const inner = ARENA_RADIUS * 0.3;
      const outer = ARENA_RADIUS * 0.95;
      g.lineStyle(1, 0x111a22);
      g.lineBetween(
        ARENA_CX + Math.cos(angle) * inner, ARENA_CY + Math.sin(angle) * inner,
        ARENA_CX + Math.cos(angle) * outer, ARENA_CY + Math.sin(angle) * outer,
      );
    }

    // Obstacles (rectangles inside arena)
    const obstacles = [
      { x: ARENA_CX - 120, y: ARENA_CY - 80, w: 30, h: 60 },
      { x: ARENA_CX + 90, y: ARENA_CY + 60, w: 60, h: 30 },
      { x: ARENA_CX - 40, y: ARENA_CY + 150, w: 40, h: 40 },
      { x: ARENA_CX + 160, y: ARENA_CY - 140, w: 30, h: 50 },
    ];
    g.fillStyle(0x223344, 0.8);
    for (const ob of obstacles) {
      g.fillRect(ob.x, ob.y, ob.w, ob.h);
    }
  }

  // ── Prefabs ────────────────────────────────────────────────────

  private registerPrefabs(): void {
    // Player bullet
    this.factory.register('bullet', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'bullet';
      const rect = scene.add.rectangle(0, 0, 4, 4, WEAPONS[this.weaponIndex].color);
      e.add(rect);
      e.addComponent('movement', new Movement(600));
      e.addComponent('hitbox', new Hitbox([
        { offsetX: -2, offsetY: -2, width: 4, height: 4, damageAmount: 10, damageType: 'physical' },
      ]));
      e.addComponent('cull', new CullOffscreen(80).usePool(this.bulletPool));
      e.addComponent('lifetime', new Lifetime(2000));
      e.addTag('spatial');
      return e;
    });

    // Enemy bullet
    this.factory.register('enemy-bullet', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'enemy-bullet';
      const rect = scene.add.rectangle(0, 0, 5, 5, 0xff4444);
      e.add(rect);
      e.addComponent('movement', new Movement(250));
      e.addComponent('hitbox', new Hitbox([
        { offsetX: -2, offsetY: -2, width: 5, height: 5, damageAmount: 1, damageType: 'physical' },
      ]));
      e.addComponent('cull', new CullOffscreen(80).usePool(this.enemyBulletPool));
      e.addComponent('lifetime', new Lifetime(3000));
      e.addTag('spatial');
      return e;
    });

    // Generic enemy (appearance/behavior set after spawn via onSpawn callback)
    this.factory.register('enemy', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'enemy';
      const rect = scene.add.rectangle(0, 0, 18, 18, 0xff4444);
      e.add(rect);
      e.addComponent('movement', new Movement(100));
      e.addComponent('health', new Health(15));
      e.addComponent('hitbox', new Hitbox([
        { offsetX: -9, offsetY: -9, width: 18, height: 18, damageAmount: 1, damageType: 'physical' },
      ]));
      e.addComponent('hurtbox', new Hurtbox([
        { offsetX: -9, offsetY: -9, width: 18, height: 18 },
      ]));
      e.addComponent('cull', new CullOffscreen(100).usePool(this.enemyPool));
      e.addTag('spatial');
      return e;
    });
  }

  // ── Player ─────────────────────────────────────────────────────

  private createPlayer(): void {
    this.player = new Entity(this, ARENA_CX, ARENA_CY);
    this.player.entityType = 'player';

    // Cyan circle body
    const body = this.add.graphics();
    body.fillStyle(0x00ffcc, 1);
    body.fillCircle(0, 0, 12);
    body.lineStyle(2, 0x00ffcc, 0.3);
    body.strokeCircle(0, 0, 18);
    this.player.add(body);
    this.player.setDepth(10);

    this.player.addComponent('health', new Health(10));
    this.player.addComponent('hurtbox', new Hurtbox([
      { offsetX: -12, offsetY: -12, width: 24, height: 24 },
    ]));

    // BulletEmitter with default weapon (machinegun)
    const weapon = WEAPONS[0];
    const emitter = new BulletEmitter(this.bulletPool, weapon.pattern, weapon.bullet);
    this.player.addComponent('emitter', emitter);

    this.player.addTag('spatial');
    this.entities.register(this.player);

    // Aim line
    this.playerAimLine = this.add.graphics();
    this.playerAimLine.setDepth(9);
  }

  private handlePlayerMovement(dt: number): void {
    const speed = 280;
    let vx = 0, vy = 0;
    if (this.actions.isDown('move_left')) vx = -1;
    if (this.actions.isDown('move_right')) vx = 1;
    if (this.actions.isDown('move_up')) vy = -1;
    if (this.actions.isDown('move_down')) vy = 1;

    // Normalize diagonal
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx = (vx / len) * speed * dt;
      vy = (vy / len) * speed * dt;
    }

    this.player.x += vx;
    this.player.y += vy;

    // Clamp to arena circle
    const dx = this.player.x - ARENA_CX;
    const dy = this.player.y - ARENA_CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ARENA_RADIUS - 14) {
      const angle = Math.atan2(dy, dx);
      this.player.x = ARENA_CX + Math.cos(angle) * (ARENA_RADIUS - 14);
      this.player.y = ARENA_CY + Math.sin(angle) * (ARENA_RADIUS - 14);
    }
  }

  private updateAimLine(): void {
    this.playerAimLine.clear();
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Math.atan2(worldPoint.y - this.player.y, worldPoint.x - this.player.x);
    const lineLen = 30;

    this.playerAimLine.lineStyle(1, WEAPONS[this.weaponIndex].color, 0.5);
    this.playerAimLine.lineBetween(
      this.player.x + Math.cos(angle) * 14,
      this.player.y + Math.sin(angle) * 14,
      this.player.x + Math.cos(angle) * (14 + lineLen),
      this.player.y + Math.sin(angle) * (14 + lineLen),
    );
  }

  // ── Weapon switching ───────────────────────────────────────────

  private switchWeapon(direction: number): void {
    this.weaponIndex = (this.weaponIndex + direction + WEAPONS.length) % WEAPONS.length;
    const weapon = WEAPONS[this.weaponIndex];

    const emitter = this.player.getComponent<BulletEmitter>('emitter')!;
    emitter.setPattern(weapon.pattern);
    emitter.setBulletConfig(weapon.bullet);

    Toast.show(this, { message: weapon.name, position: 'bottom', duration: 1000 });
    this.audio.procedural.tone({ frequency: 400, type: 'square', duration: 0.05, volume: 0.08 });
    ConsoleReporter.state(`weapon: ${weapon.name}`);
  }

  // ── Waves ──────────────────────────────────────────────────────

  private setupWaves(): void {
    this.waveManager = new WaveManager(this.factory, this.entities);

    const spawnArea = { x: ARENA_CX - ARENA_RADIUS, y: ARENA_CY - ARENA_RADIUS, width: ARENA_RADIUS * 2, height: ARENA_RADIUS * 2 };

    const waves = [];
    for (let i = 0; i < 20; i++) {
      const count = 3 + Math.floor(i * 1.5);
      waves.push({
        spawns: [{ prefab: 'enemy', count, spawnArea, interval: 400 }],
        delayBefore: i === 0 ? 1000 : 2000,
        delayAfter: 500,
      });
    }

    this.waveManager.setWaves(waves);

    this.waveManager.onWaveStart((idx) => {
      Toast.show(this, { message: `Wave ${idx + 1}`, position: 'center', duration: 1500 });
      this.hud.updateCounter('wave', idx + 1);
      ConsoleReporter.state(`wave ${idx + 1} started`);
    });

    this.waveManager.onSpawn((entity, waveIdx) => {
      // Place enemies on arena perimeter
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = ARENA_RADIUS * 0.85;
      entity.x = ARENA_CX + Math.cos(angle) * spawnDist;
      entity.y = ARENA_CY + Math.sin(angle) * spawnDist;

      // Vary enemy types based on wave
      this.configureEnemy(entity, waveIdx);

      entity.addTag('spatial');
      GameFeelPresets.spawnIn(this, entity, { duration: 200 });
    });

    this.waveManager.onAllComplete(() => {
      Toast.show(this, { message: `All waves cleared! Score: ${this.score}`, position: 'center', duration: 5000 });
    });

    this.waveManager.start();
  }

  private configureEnemy(entity: Entity, waveIdx: number): void {
    const healthMod = this.directorAI.getModifier('enemyHealth');
    const health = entity.getComponent<Health>('health')!;
    const movement = entity.getComponent<Movement>('movement')!;

    // Enemy variety based on random + wave index
    const roll = Math.random();
    const rect = entity.list[0] as Phaser.GameObjects.Rectangle;

    if (roll < 0.1 && waveIdx >= 3) {
      // Tank: big, slow, high HP
      health.max = Math.round(40 * healthMod);
      health.current = health.max;
      movement.speed = 50;
      rect.setDisplaySize(28, 28);
      rect.setFillStyle(0x880000);
      entity.entityType = 'tank';
    } else if (roll < 0.25 && waveIdx >= 2) {
      // Shooter: has own BulletEmitter
      health.max = Math.round(10 * healthMod);
      health.current = health.max;
      movement.speed = 40;
      rect.setFillStyle(0xff8800);
      entity.entityType = 'shooter';
    } else if (roll < 0.5) {
      // Swarm: fast, low HP
      health.max = Math.round(5 * healthMod);
      health.current = health.max;
      movement.speed = 160;
      rect.setDisplaySize(10, 10);
      rect.setFillStyle(0xff44ff);
      entity.entityType = 'swarm';
    } else {
      // Chaser: default
      health.max = Math.round(15 * healthMod);
      health.current = health.max;
      movement.speed = 80 + waveIdx * 3;
      rect.setFillStyle(0xff4444);
      entity.entityType = 'chaser';
    }
  }

  // ── Enemy AI ───────────────────────────────────────────────────

  private updateEnemies(dt: number): void {
    const enemies = this.entities.getByType('chaser')
      .concat(this.entities.getByType('shooter'), this.entities.getByType('tank'), this.entities.getByType('swarm'), this.entities.getByType('enemy'))
      .filter(e => e.active);

    for (const enemy of enemies) {
      const movement = enemy.getComponent<Movement>('movement');
      if (!movement) continue;

      // Move toward player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (enemy.entityType === 'shooter') {
        // Shooters keep distance and fire
        if (dist > 200) {
          movement.moveToward(this.player.x, this.player.y);
        } else if (dist < 150) {
          movement.setVelocity(-dx / dist * movement.speed, -dy / dist * movement.speed);
        } else {
          movement.stop();
        }

        // Shooter fires enemy bullets
        if (dist < 350 && Math.random() < 0.01) {
          const bullet = this.enemyBulletPool.acquire(enemy.x, enemy.y);
          if (bullet) {
            bullet.addTag('spatial');
            const aimAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const mov = bullet.getComponent<Movement>('movement')!;
            mov.setVelocity(Math.cos(aimAngle) * 250, Math.sin(aimAngle) * 250);
          }
        }
      } else {
        // All others chase
        movement.moveToward(this.player.x, this.player.y);
      }

      // Clamp enemies to arena
      const edx = enemy.x - ARENA_CX;
      const edy = enemy.y - ARENA_CY;
      const edist = Math.sqrt(edx * edx + edy * edy);
      if (edist > ARENA_RADIUS - 10) {
        const a = Math.atan2(edy, edx);
        enemy.x = ARENA_CX + Math.cos(a) * (ARENA_RADIUS - 10);
        enemy.y = ARENA_CY + Math.sin(a) * (ARENA_RADIUS - 10);
      }
    }
  }

  // ── Combat events ──────────────────────────────────────────────

  private onEnemyKill(event: DamageEvent): void {
    const ex = event.target.x;
    const ey = event.target.y;

    // Release bullet back to pool, destroy enemy (WaveManager-created, not pooled)
    if (event.source && event.source.entityType === 'bullet') {
      this.bulletPool.release(event.source);
    }
    this.entities.unregister(event.target);
    event.target.destroy();

    // Combo
    this.combo++;
    this.comboTimer = this.COMBO_WINDOW;
    const points = 10 * (1 + Math.floor(this.combo / 2));
    this.score += points;

    // Effects
    this.gpuParticles.burst(15 + this.combo * 3, ex, ey);
    this.particles.explode(ex, ey, 0xff4444, { comboMultiplier: this.combo });
    ScorePopup.score(this, ex, ey - 15, points, this.combo);
    this.audio.procedural.merge(Math.min(5, 1 + this.combo));

    if (this.combo >= 3) {
      this.comboDisplay.show(this.combo, { color: 0xff8800 });
      SceneUtils.comboShake(this, this.combo);
      this.effectComposer.play('criticalHit', ex, ey);
    }
    if (this.combo >= 5) {
      SceneUtils.screenFlashColor(this, { color: 0xffffff, alpha: 0.08 });
    }

    // Director
    this.directorAI.recordEvent('kill');
    if (this.combo >= 3) this.directorAI.recordEvent('combo');

    this.hud.updateCounter('score', this.score);
    ConsoleReporter.state(`kill, score: ${this.score}, combo: ${this.combo}`);
  }

  private onPlayerHit(event: DamageEvent): void {
    if (this.isGameOver) return;
    const health = this.player.getComponent<Health>('health')!;

    // Release attacker
    if (event.source) {
      if (event.source.entityType === 'enemy-bullet') {
        this.enemyBulletPool.release(event.source);
      } else {
        this.enemyPool.release(event.source);
      }
    }

    // Iframes
    const hurtbox = this.player.getComponent<Hurtbox>('hurtbox')!;
    hurtbox.triggerIframes(1200);

    // Effects
    this.particles.impact(event.target.x, event.target.y, 0x00ffcc, 2);
    SceneUtils.screenFlash(this, 0xff0000, 200);
    SceneUtils.hitStop(this, 40);
    this.audio.procedural.explosion();

    this.directorAI.recordEvent('damage_taken');
    this.hud.updateCounter('hp', health.current);

    if (health.isDead) {
      this.isGameOver = true;
      this.directorAI.recordEvent('death');
      this.effectComposer.play('death');
      this.audio.proceduralMusic.stop(1000);
      this.audio.procedural.gameOver();
      Toast.show(this, { message: `Game Over! Score: ${this.score}`, position: 'center', duration: 5000 });
      ConsoleReporter.state('game over', { score: this.score });
    }
  }
}
