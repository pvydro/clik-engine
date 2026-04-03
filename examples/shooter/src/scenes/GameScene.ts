import {
  BaseScene, ConsoleReporter, Toast,
  GraphicsParticles, ScorePopup, ComboDisplay, AnimatedHUD,
  GameFeelPresets, SceneUtils,
  Entity, EntityFactory, EntityPool,
  Movement, Health, Hitbox, Hurtbox, CullOffscreen, Lifetime,
  CombatManager,
} from 'clik-engine';
import type { DamageEvent } from 'clik-engine';
import Phaser from 'phaser';

export class GameScene extends BaseScene {
  private player!: Entity;
  private playerGlow!: Phaser.GameObjects.Rectangle;
  private stars: Phaser.GameObjects.Rectangle[] = [];
  private score = 0;
  private lives = 3;
  private hud!: AnimatedHUD;
  private particles!: GraphicsParticles;
  private comboDisplay!: ComboDisplay;
  private spawnTimer = 0;
  private shootCooldown = 0;
  private difficulty = 1;
  private isGameOver = false;
  private combo = 0;
  private comboTimer = 0;
  private readonly COMBO_WINDOW = 2000;

  private factory!: EntityFactory;
  private bulletPool!: EntityPool;
  private enemyPool!: EntityPool;
  private combat!: CombatManager;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000011');

    if (this.physics?.world) {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
    }

    // Systems
    this.particles = new GraphicsParticles(this);
    this.comboDisplay = new ComboDisplay(this, { particles: this.particles, y: 60 });
    this.entities.enableSpatial({ cellSize: 64 });

    // Entity factory + prefabs
    this.factory = new EntityFactory().useRegistry(this.entities);

    this.factory.register('bullet', (scene, x, y) => {
      const e = new Entity(scene, x, y);
      e.entityType = 'bullet';
      const rect = scene.add.rectangle(0, 0, 4, 12, 0xffff00);
      e.add(rect);
      e.addComponent('movement', new Movement(600));
      e.addComponent('hitbox', new Hitbox([
        { offsetX: -2, offsetY: -6, width: 4, height: 12, damageAmount: 10, damageType: 'physical' },
      ]));
      e.addComponent('lifetime', new Lifetime(3000));
      e.addTag('spatial');
      return e;
    });

    this.factory.register('enemy', (scene, x, y) => {
      const size = Phaser.Math.Between(16, 28);
      const e = new Entity(scene, x, y);
      e.entityType = 'enemy';
      const rect = scene.add.rectangle(0, 0, size, size, 0xff4444);
      e.add(rect);
      e.addComponent('movement', new Movement(120));
      e.addComponent('health', new Health(10));
      e.addComponent('hurtbox', new Hurtbox([
        { offsetX: -size / 2, offsetY: -size / 2, width: size, height: size },
      ]));
      e.addComponent('cull', new CullOffscreen(30));
      e.addTag('spatial');
      return e;
    });

    // Pools
    this.bulletPool = this.factory.createPool('bullet', this, { maxSize: 50 });
    this.bulletPool.prewarm(20);
    this.enemyPool = this.factory.createPool('enemy', this, { maxSize: 30 });

    // Starfield
    for (let i = 0; i < 80; i++) {
      const s = this.add.rectangle(
        Math.random() * width, Math.random() * height,
        Math.random() * 2 + 1, Math.random() * 2 + 1,
        0xffffff, Math.random() * 0.6 + 0.2,
      );
      this.stars.push(s);
    }

    // Player glow
    this.playerGlow = this.add.rectangle(width / 2, height - 60, 56, 56, 0x00ff88, 0.06)
      .setDepth(4);

    // Player entity
    this.player = new Entity(this, width / 2, height - 60);
    this.player.entityType = 'player';
    const playerRect = this.add.rectangle(0, 0, 32, 24, 0x00ff88);
    this.player.add(playerRect);
    this.player.setDepth(5);
    this.player.addComponent('health', new Health(3));
    this.player.addComponent('hurtbox', new Hurtbox([
      { offsetX: -16, offsetY: -12, width: 32, height: 24 },
    ]));
    this.player.addTag('spatial');
    this.entities.register(this.player);

    // Combat manager
    this.combat = new CombatManager(this.entities);

    this.combat.onDamage((event: DamageEvent) => {
      if (event.target === this.player) {
        this.onPlayerHit(event);
      } else {
        this.onEnemyKill(event);
      }
    });

    this.combat.onKill((event: DamageEvent) => {
      if (event.target !== this.player) {
        this.enemyPool.release(event.target);
      }
    });

    // HUD
    this.hud = new AnimatedHUD(this);
    this.hud.addCounter('score', { label: 'SCORE', x: 60, y: 30, color: 0x00ff88 });
    this.hud.addCounter('lives', {
      label: 'LIVES', x: width - 60, y: 30, color: 0xff6666,
      warningThreshold: 1, warningColor: 0xff0000,
    });
    this.hud.updateCounter('lives', this.lives);

    this.add.text(width / 2, height - 16, 'WASD/Arrows to move, Space to shoot', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5).setScrollFactor(0);

    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.2);

    this.inspectState('shooter', () => ({
      score: this.score,
      lives: this.lives,
      enemies: this.enemyPool.activeCount,
      bullets: this.bulletPool.activeCount,
      difficulty: this.difficulty,
      combo: this.combo,
    }));

    ConsoleReporter.scene('Space Shooter ready (entity system)');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.isGameOver) return;

    const speed = 350;
    const dt = delta / 1000;

    // Player movement
    let vx = 0, vy = 0;
    if (this.actions.isDown('move_left')) vx = -speed;
    if (this.actions.isDown('move_right')) vx = speed;
    if (this.actions.isDown('move_up')) vy = -speed;
    if (this.actions.isDown('move_down')) vy = speed;
    this.player.x += vx * dt;
    this.player.y += vy * dt;
    // Clamp to world bounds
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, this.scale.width - 16);
    this.player.y = Phaser.Math.Clamp(this.player.y, 12, this.scale.height - 12);

    this.playerGlow.setPosition(this.player.x, this.player.y);

    // Shooting
    this.shootCooldown -= delta;
    if (this.actions.isDown('shoot') && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = 150;
    }

    // Combo decay
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Spawn enemies
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = Math.max(400, 2000 - this.difficulty * 100);
    }

    // Difficulty ramp
    const newDiff = 1 + Math.floor(time / 15000);
    if (newDiff !== this.difficulty) {
      this.difficulty = newDiff;
      this.audio.proceduralMusic.setIntensity(Math.min(1, 0.2 + this.difficulty * 0.15));
    }

    // Combat — check all hitbox/hurtbox collisions
    this.combat.update();

    // Scroll stars
    for (const star of this.stars) {
      star.y += (star.width + 0.5) * 60 * dt;
      if (star.y > this.scale.height) {
        star.y = 0;
        star.x = Math.random() * this.scale.width;
      }
    }
  }

  private shoot(): void {
    const bullet = this.bulletPool.acquire(this.player.x, this.player.y - 20);
    if (!bullet) return;
    const movement = bullet.getComponent<Movement>('movement')!;
    movement.setVelocity(0, -600);
    this.audio.procedural.tone({ frequency: 800, type: 'sine', duration: 0.04, volume: 0.1 });
  }

  private spawnEnemy(): void {
    const x = Phaser.Math.Between(40, this.scale.width - 40);
    const enemy = this.enemyPool.acquire(x, -20);
    if (!enemy) return;
    const speed = Phaser.Math.Between(80, 150 + this.difficulty * 20);
    const movement = enemy.getComponent<Movement>('movement')!;
    movement.setVelocity(Phaser.Math.Between(-30, 30), speed);
    GameFeelPresets.spawnIn(this, enemy, { duration: 150 });
  }

  private onEnemyKill(event: DamageEvent): void {
    const ex = event.target.x;
    const ey = event.target.y;

    // Release bullet back to pool
    this.bulletPool.release(event.source!);

    this.combo++;
    this.comboTimer = this.COMBO_WINDOW;
    const points = 10 * this.difficulty * this.combo;
    this.score += points;

    this.particles.explode(ex, ey, 0xff4444, { comboMultiplier: this.combo });
    ScorePopup.score(this, ex, ey - 15, points, this.combo);
    this.audio.procedural.merge(this.difficulty);

    if (this.combo >= 2) {
      this.comboDisplay.show(this.combo, { color: 0xff8800 });
      SceneUtils.comboShake(this, this.combo);
      this.audio.procedural.chain(this.combo);
    }
    if (this.combo >= 3) {
      SceneUtils.screenFlashColor(this, { color: 0xffffff, alpha: 0.1 });
    }

    this.hud.updateCounter('score', this.score);
    ConsoleReporter.state(`kill, score: ${this.score}, combo: ${this.combo}`);
  }

  private onPlayerHit(event: DamageEvent): void {
    const ex = event.source?.x ?? event.target.x;
    const ey = event.source?.y ?? event.target.y;

    // Release enemy that hit us
    if (event.source) this.enemyPool.release(event.source);

    this.lives--;
    const hurtbox = this.player.getComponent<Hurtbox>('hurtbox')!;
    hurtbox.triggerIframes(1000);

    this.particles.impact(ex, ey, 0x00ff88, 2);
    this.audio.procedural.explosion();
    SceneUtils.screenFlash(this, 0xff0000, 200);
    SceneUtils.hitStop(this, 30);

    this.hud.updateCounter('lives', this.lives);

    if (this.lives <= 0) {
      this.isGameOver = true;
      this.audio.proceduralMusic.stop(1000);
      this.audio.procedural.gameOver();
      Toast.show(this, { message: `Game Over! Score: ${this.score}`, position: 'center', duration: 5000 });
      ConsoleReporter.state('game over', { score: this.score });
    }
  }
}
