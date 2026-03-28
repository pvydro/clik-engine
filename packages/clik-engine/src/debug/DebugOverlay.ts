import Phaser from 'phaser';
import { ConsoleReporter } from './ConsoleReporter';

export class DebugOverlay extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;
  private entityText!: Phaser.GameObjects.Text;
  private sceneText!: Phaser.GameObjects.Text;
  private memoryText!: Phaser.GameObjects.Text;
  private errorBanner: Phaser.GameObjects.Text | null = null;

  private static readonly STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#00ff88',
    backgroundColor: '#000000aa',
    padding: { x: 4, y: 2 },
  };

  constructor() {
    super({ key: '__clik_debug_overlay' });
  }

  create(): void {
    const x = 8;
    this.fpsText = this.add.text(x, 8, 'FPS: --', DebugOverlay.STYLE).setDepth(9999);
    this.sceneText = this.add.text(x, 26, 'Scene: --', DebugOverlay.STYLE).setDepth(9999);
    this.entityText = this.add.text(x, 44, 'Entities: --', DebugOverlay.STYLE).setDepth(9999);
    this.memoryText = this.add.text(x, 62, '', DebugOverlay.STYLE).setDepth(9999);

    ConsoleReporter.engine('DebugOverlay active');
  }

  update(): void {
    const fps = Math.round(this.game.loop.actualFps);
    this.fpsText.setText(`FPS: ${fps}`);

    const activeScenes = this.game.scene.getScenes(true)
      .filter(s => !s.scene.key.startsWith('__clik_'))
      .map(s => s.scene.key);
    this.sceneText.setText(`Scene: ${activeScenes.join(', ') || '--'}`);

    let entityCount = 0;
    for (const scene of this.game.scene.getScenes(true)) {
      if (scene.scene.key.startsWith('__clik_')) continue;
      entityCount += scene.children?.length ?? 0;
    }
    this.entityText.setText(`Entities: ${entityCount}`);

    const perf = (performance as unknown as { memory?: { usedJSHeapSize: number } });
    if (perf.memory) {
      const mb = (perf.memory.usedJSHeapSize / 1048576).toFixed(1);
      this.memoryText.setText(`Mem: ${mb}MB`);
    }
  }

  showError(message: string, suggestion?: string): void {
    if (this.errorBanner) {
      this.errorBanner.destroy();
    }

    const { width } = this.scale;
    const text = suggestion ? `ERROR: ${message}\n${suggestion}` : `ERROR: ${message}`;

    this.errorBanner = this.add.text(width / 2, 100, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#cc0000dd',
      padding: { x: 12, y: 8 },
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5, 0).setDepth(10000);

    ConsoleReporter.error(message, suggestion);
  }

  clearError(): void {
    if (this.errorBanner) {
      this.errorBanner.destroy();
      this.errorBanner = null;
    }
  }
}
