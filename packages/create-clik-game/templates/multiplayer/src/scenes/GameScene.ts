import { BaseScene, StateSync, Label } from '@pvydro/clik-engine';

/**
 * Game scene — multiplayer gameplay with synced player positions.
 * Each player is a colored rectangle that moves with arrow keys.
 */
export class GameScene extends BaseScene {
  private sync!: StateSync;
  private localPlayer!: Phaser.GameObjects.Rectangle;
  private remotePlayers: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private speed = 200;

  create(): void {
    super.create();
    const { width, height } = this.scale;

    new Label(this, { x: width / 2, y: 20, text: 'Move with arrow keys', fontSize: '14px', color: '#666666' });

    // Create local player
    this.localPlayer = this.add.rectangle(width / 2, height / 2, 32, 32, 0x00ff88);

    // Set up state sync
    this.sync = new StateSync(this.network, { syncRate: 50, interpolationDelay: 100 });
    this.sync.registerLocal('local', this.localPlayer);
    this.sync.start();

    // Listen for remote player state
    this.network.onMessage((type, data) => {
      if (type === 'sync:state') {
        const syncData = data as { entities: { id: string; x: number; y: number }[]; serverTime: number };
        for (const entity of syncData.entities) {
          if (entity.id === 'local') continue;
          if (!this.remotePlayers.has(entity.id)) {
            const remote = this.add.rectangle(entity.x, entity.y, 32, 32, 0xff8800);
            this.remotePlayers.set(entity.id, remote);
            this.sync.registerRemote(entity.id, remote);
          }
        }
      }
    });

    // Clean up on room leave
    this.room.onPlayerLeft(id => {
      const remote = this.remotePlayers.get(id);
      if (remote) {
        this.sync.unregister(id);
        remote.destroy();
        this.remotePlayers.delete(id);
      }
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    // Move local player
    const dt = delta / 1000;
    if (this.actions.isDown('left'))  this.localPlayer.x -= this.speed * dt;
    if (this.actions.isDown('right')) this.localPlayer.x += this.speed * dt;
    if (this.actions.isDown('up'))    this.localPlayer.y -= this.speed * dt;
    if (this.actions.isDown('down'))  this.localPlayer.y += this.speed * dt;

    // Update interpolation for remote players
    this.sync.update(delta);
  }

  shutdown(): void {
    this.sync?.destroy();
    this.remotePlayers.clear();
    super.shutdown();
  }
}
