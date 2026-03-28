import { BaseScene, PhysicsHelper, ConsoleReporter, Toast } from 'clik-engine';
import Phaser from 'phaser';

export class GameScene extends BaseScene {
  private player!: Phaser.GameObjects.Rectangle;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private stars: Phaser.GameObjects.Rectangle[] = [];
  private score = 0;
  private lives = 3;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private spawnTimer = 0;
  private shootCooldown = 0;
  private difficulty = 1;
  private gameOver = false;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000011');

    // Starfield
    for (let i = 0; i < 80; i++) {
      const s = this.add.rectangle(
        Math.random() * width, Math.random() * height,
        Math.random() * 2 + 1, Math.random() * 2 + 1,
        0xffffff, Math.random() * 0.6 + 0.2
      );
      this.stars.push(s);
    }

    // Player
    this.player = this.add.rectangle(width / 2, height - 60, 32, 24, 0x00ff88);
    PhysicsHelper.enableBody(this, this.player);
    PhysicsHelper.setCollideWorldBounds(this.player);
    PhysicsHelper.setDrag(this.player, 800, 800);

    // Groups
    this.bullets = PhysicsHelper.createGroup(this, { maxSize: 30 });
    this.enemies = PhysicsHelper.createGroup(this, { maxSize: 20 });

    // Collisions
    PhysicsHelper.addOverlap(this, this.bullets, this.enemies, (_bullet, _enemy) => {
      const bullet = _bullet as Phaser.GameObjects.Rectangle;
      const enemy = _enemy as Phaser.GameObjects.Rectangle;
      bullet.destroy();
      this.spawnExplosion(enemy.x, enemy.y);
      enemy.destroy();
      this.score += 10 * this.difficulty;
      this.scoreText.setText(`Score: ${this.score}`);
      ConsoleReporter.state(`kill, score: ${this.score}`);
    });

    PhysicsHelper.addOverlap(this, this.player, this.enemies, (_player, _enemy) => {
      const enemy = _enemy as Phaser.GameObjects.Rectangle;
      this.spawnExplosion(enemy.x, enemy.y);
      enemy.destroy();
      this.lives--;
      this.livesText.setText(`Lives: ${this.lives}`);
      this.cameras.main.shake(150, 0.01);
      if (this.lives <= 0) {
        this.gameOver = true;
        Toast.show(this, { message: `Game Over! Score: ${this.score}`, position: 'center', duration: 5000 });
        ConsoleReporter.state('game over', { score: this.score });
      }
    });

    // HUD
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '18px', fontFamily: 'monospace', color: '#00ff88',
    }).setScrollFactor(0);

    this.livesText = this.add.text(width - 16, 16, `Lives: ${this.lives}`, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ff6666',
    }).setOrigin(1, 0).setScrollFactor(0);

    this.add.text(width / 2, height - 16, 'WASD/Arrows to move, Space to shoot', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5).setScrollFactor(0);

    this.inspectState('shooter', () => ({
      score: this.score,
      lives: this.lives,
      enemies: this.enemies.countActive(),
      bullets: this.bullets.countActive(),
      difficulty: this.difficulty,
    }));

    ConsoleReporter.scene('Space Shooter ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.gameOver) return;

    const speed = 350;
    const dt = delta / 1000;

    // Player movement
    let vx = 0, vy = 0;
    if (this.actions.isDown('move_left')) vx = -speed;
    if (this.actions.isDown('move_right')) vx = speed;
    if (this.actions.isDown('move_up')) vy = -speed;
    if (this.actions.isDown('move_down')) vy = speed;
    PhysicsHelper.setVelocity(this.player, vx, vy);

    // Shooting
    this.shootCooldown -= delta;
    if (this.actions.isDown('shoot') && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = 150;
    }

    // Spawn enemies
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = Math.max(400, 2000 - this.difficulty * 100);
    }

    // Increase difficulty over time
    this.difficulty = 1 + Math.floor(time / 15000);

    // Scroll stars
    for (const star of this.stars) {
      star.y += (star.width + 0.5) * 60 * dt;
      if (star.y > this.scale.height) {
        star.y = 0;
        star.x = Math.random() * this.scale.width;
      }
    }

    // Remove off-screen bullets and enemies
    for (const bullet of this.bullets.getChildren()) {
      if ((bullet as Phaser.GameObjects.Rectangle).y < -10) bullet.destroy();
    }
    for (const enemy of this.enemies.getChildren()) {
      if ((enemy as Phaser.GameObjects.Rectangle).y > this.scale.height + 20) enemy.destroy();
    }
  }

  private shoot(): void {
    const bullet = this.add.rectangle(this.player.x, this.player.y - 20, 4, 12, 0xffff00);
    this.bullets.add(bullet);
    PhysicsHelper.enableBody(this, bullet);
    PhysicsHelper.setVelocityY(bullet, -600);
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
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const particle = this.add.rectangle(
        x + Phaser.Math.Between(-8, 8),
        y + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(2, 5),
        Phaser.Math.Between(2, 5),
        Phaser.Math.RND.pick([0xff6600, 0xffcc00, 0xff3300]),
      );
      this.tweens.add({
        targets: particle,
        alpha: 0,
        x: particle.x + Phaser.Math.Between(-30, 30),
        y: particle.y + Phaser.Math.Between(-30, 30),
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(200, 400),
        onComplete: () => particle.destroy(),
      });
    }
  }
}
