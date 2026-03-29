import {
  BaseScene, PhysicsHelper, ConsoleReporter, Toast,
  GraphicsParticles, ScorePopup, ComboDisplay, AnimatedHUD,
  GameFeelPresets, SceneUtils,
} from 'clik-engine';
import Phaser from 'phaser';

export class GameScene extends BaseScene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerGlow!: Phaser.GameObjects.Rectangle;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
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
  private readonly COMBO_WINDOW = 2000; // ms to keep combo alive

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000011');

    // Disable physics debug draws (green lines on every body)
    if (this.physics?.world) {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
    }

    // Systems
    this.particles = new GraphicsParticles(this);
    this.comboDisplay = new ComboDisplay(this, { particles: this.particles, y: 60 });

    // Starfield
    for (let i = 0; i < 80; i++) {
      const s = this.add.rectangle(
        Math.random() * width, Math.random() * height,
        Math.random() * 2 + 1, Math.random() * 2 + 1,
        0xffffff, Math.random() * 0.6 + 0.2,
      );
      this.stars.push(s);
    }

    // Player glow (simple rectangle with low alpha — no Graphics trails)
    this.playerGlow = this.add.rectangle(width / 2, height - 60, 56, 56, 0x00ff88, 0.06)
      .setDepth(4);

    // Player
    this.player = this.add.rectangle(width / 2, height - 60, 32, 24, 0x00ff88);
    this.player.setDepth(5);
    PhysicsHelper.enableBody(this, this.player);
    PhysicsHelper.setCollideWorldBounds(this.player);
    PhysicsHelper.setDrag(this.player, 800, 800);

    // Groups
    this.bullets = PhysicsHelper.createGroup(this, { maxSize: 30 });
    this.enemies = PhysicsHelper.createGroup(this, { maxSize: 20 });

    // Collisions — bullet hits enemy
    PhysicsHelper.addOverlap(this, this.bullets, this.enemies, (_bullet, _enemy) => {
      const bullet = _bullet as Phaser.GameObjects.Rectangle;
      const enemy = _enemy as Phaser.GameObjects.Rectangle;
      const ex = enemy.x;
      const ey = enemy.y;

      bullet.destroy();
      enemy.destroy();

      // Combo tracking
      this.combo++;
      this.comboTimer = this.COMBO_WINDOW;
      const points = 10 * this.difficulty * this.combo;
      this.score += points;

      // Visual feedback
      this.particles.explode(ex, ey, 0xff4444, { comboMultiplier: this.combo });
      ScorePopup.score(this, ex, ey - 15, points, this.combo);
      this.audio.procedural.merge(this.difficulty);

      // Combo effects
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
    });

    // Collisions — enemy hits player
    PhysicsHelper.addOverlap(this, this.player, this.enemies, (_player, _enemy) => {
      const enemy = _enemy as Phaser.GameObjects.Rectangle;
      const ex = enemy.x;
      const ey = enemy.y;

      enemy.destroy();
      this.lives--;

      // Heavy impact feedback
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

    // Start music
    this.audio.proceduralMusic.play('game');
    this.audio.proceduralMusic.setIntensity(0.2);

    this.inspectState('shooter', () => ({
      score: this.score,
      lives: this.lives,
      enemies: this.enemies.countActive(),
      bullets: this.bullets.countActive(),
      difficulty: this.difficulty,
      combo: this.combo,
    }));

    ConsoleReporter.scene('Space Shooter ready');
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
    PhysicsHelper.setVelocity(this.player, vx, vy);

    // Keep glow on player
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
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Spawn enemies
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = Math.max(400, 2000 - this.difficulty * 100);
    }

    // Increase difficulty over time
    const newDiff = 1 + Math.floor(time / 15000);
    if (newDiff !== this.difficulty) {
      this.difficulty = newDiff;
      this.audio.proceduralMusic.setIntensity(Math.min(1, 0.2 + this.difficulty * 0.15));
    }

    // Scroll stars
    for (const star of this.stars) {
      star.y += (star.width + 0.5) * 60 * dt;
      if (star.y > this.scale.height) {
        star.y = 0;
        star.x = Math.random() * this.scale.width;
      }
    }

    // Remove off-screen bullets and enemies (copy array to avoid mutation during iteration)
    const bulletsToRemove = this.bullets.getChildren().filter(
      b => (b as Phaser.GameObjects.Rectangle).y < -10,
    );
    for (const b of bulletsToRemove) b.destroy();

    const enemiesToRemove = this.enemies.getChildren().filter(
      e => (e as Phaser.GameObjects.Rectangle).y > this.scale.height + 20,
    );
    for (const e of enemiesToRemove) e.destroy();
  }

  private shoot(): void {
    const bullet = this.add.rectangle(this.player.x, this.player.y - 20, 4, 12, 0xffff00);
    this.bullets.add(bullet);
    PhysicsHelper.enableBody(this, bullet);
    PhysicsHelper.setVelocityY(bullet, -600);
    this.audio.procedural.tone({ frequency: 800, type: 'sine', duration: 0.04, volume: 0.1 });
  }

  private spawnEnemy(): void {
    const x = Phaser.Math.Between(40, this.scale.width - 40);
    const size = Phaser.Math.Between(16, 28);
    const enemy = this.add.rectangle(x, -20, size, size, 0xff4444);
    this.enemies.add(enemy);
    PhysicsHelper.enableBody(this, enemy);
    const speed = Phaser.Math.Between(80, 150 + this.difficulty * 20);
    PhysicsHelper.setVelocityY(enemy, speed);
    PhysicsHelper.setVelocityX(enemy, Phaser.Math.Between(-30, 30));

    // Spawn animation
    GameFeelPresets.spawnIn(this, enemy, { duration: 150 });
  }
}
