import { BaseScene, PhysicsHelper, ConsoleReporter } from 'clik-engine';
import Phaser from 'phaser';

export class GameScene extends BaseScene {
  private player!: Phaser.GameObjects.Rectangle;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private score = 0;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create();

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Create platforms
    this.platforms = PhysicsHelper.createStaticGroup(this);

    // Ground
    const ground = this.add.rectangle(width / 2, height - 20, width, 40, 0x333355);
    this.platforms.add(ground);

    // Floating platforms
    const platPositions = [
      { x: 200, y: height - 180, w: 160 },
      { x: 500, y: height - 300, w: 120 },
      { x: 750, y: height - 200, w: 140 },
      { x: 350, y: height - 440, w: 100 },
      { x: 600, y: height - 500, w: 160 },
    ];
    for (const p of platPositions) {
      const plat = this.add.rectangle(p.x, p.y, p.w, 16, 0x444477);
      this.platforms.add(plat);
    }

    // Player
    this.player = this.add.rectangle(100, height - 100, 32, 48, 0x00ff88);
    PhysicsHelper.enableBody(this, this.player);
    PhysicsHelper.setCollideWorldBounds(this.player);
    PhysicsHelper.setBounce(this.player, 0.1);

    // Gravity
    PhysicsHelper.setGravity(this, 0, 800);

    // Collision
    PhysicsHelper.addCollider(this, this.player, this.platforms);

    // Title
    this.add.text(width / 2, 30, '{{name}}', {
      fontSize: '24px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(width / 2, 55, 'Arrow keys / WASD to move, Space to jump', {
      fontSize: '12px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5).setScrollFactor(0);

    // Debug state
    this.inspectState('player', () => ({
      x: this.player.x,
      y: this.player.y,
      onFloor: PhysicsHelper.isOnFloor(this.player),
      vel: PhysicsHelper.getVelocity(this.player),
    }));

    ConsoleReporter.scene('Platformer ready');
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    const speed = 300;

    // Horizontal movement
    if (this.actions.isDown('move_left')) {
      PhysicsHelper.setVelocityX(this.player, -speed);
    } else if (this.actions.isDown('move_right')) {
      PhysicsHelper.setVelocityX(this.player, speed);
    } else {
      PhysicsHelper.setVelocityX(this.player, 0);
    }

    // Jump
    if (this.actions.justPressed('jump') && PhysicsHelper.isOnFloor(this.player)) {
      PhysicsHelper.setVelocityY(this.player, -500);
      ConsoleReporter.state('player jumped');
    }
  }
}
