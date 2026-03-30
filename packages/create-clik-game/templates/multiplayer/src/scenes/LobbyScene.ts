import { BaseScene, Button, Label } from '@pvydro/clik-engine';

/**
 * Lobby scene — connect to server, create/join room, then start game.
 */
export class LobbyScene extends BaseScene {
  private statusLabel!: ReturnType<typeof Label.prototype.setText>;

  create(): void {
    super.create();
    const { width, height } = this.scale;

    new Label(this, { x: width / 2, y: 80, text: '{{name}}', fontSize: '32px' });

    const statusLabel = new Label(this, { x: width / 2, y: 140, text: 'Connecting...', fontSize: '16px', color: '#888888' });

    // Connect to server
    this.network.connect();
    this.network.onStateChange(state => {
      statusLabel.setText(`Status: ${state}`);
    });

    // Quick match button
    new Button(this, {
      x: width / 2, y: height / 2,
      text: 'Quick Match',
      width: 200,
      borderRadius: 8,
      onClick: () => {
        this.lobby.quickMatch('{{name}}');
      },
    });

    // Create room button
    new Button(this, {
      x: width / 2, y: height / 2 + 60,
      text: 'Create Room',
      width: 200,
      borderRadius: 8,
      onClick: () => {
        this.lobby.createRoom('{{name}} Room', 4);
      },
    });

    // When joined a room, start the game scene
    this.network.onMessage((type) => {
      if (type === 'room:joined') {
        this.director.go('lobby', 'game');
      }
    });
  }
}
