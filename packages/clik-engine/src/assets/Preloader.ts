import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { loadManifestTier } from './AssetManifest';
import type { AssetManifest } from '../utils/types';

export class Preloader extends Phaser.Scene {
  protected manifest: AssetManifest | null = null;
  protected nextScene = '';

  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor(config?: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config ?? { key: 'preload' });
  }

  init(data?: { manifest?: AssetManifest; nextScene?: string }): void {
    if (data?.manifest) this.manifest = data.manifest;
    if (data?.nextScene) this.nextScene = data.nextScene;
    ConsoleReporter.asset('Preloader init', { hasManifest: !!this.manifest, nextScene: this.nextScene });
  }

  preload(): void {
    const { width, height } = this.scale;
    const barWidth = Math.min(width * 0.6, 400);
    const barHeight = 20;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(width / 2, barY - 30, 'Loading...', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.percentText = this.add.text(width / 2, barY + barHeight + 16, '0%', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00ff88, 1);
      this.progressBar.fillRect(barX, barY, barWidth * value, barHeight);
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      ConsoleReporter.asset('All assets loaded');
    });

    if (this.manifest) {
      if (this.manifest.boot) {
        loadManifestTier(this.load, this.manifest.boot);
      }
      if (this.manifest.main) {
        loadManifestTier(this.load, this.manifest.main);
      }
    }
  }

  create(): void {
    this.progressBar.destroy();
    this.progressBox.destroy();
    this.loadingText.destroy();
    this.percentText.destroy();

    if (this.nextScene) {
      ConsoleReporter.scene(`Preloader complete, starting: ${this.nextScene}`);
      this.scene.start(this.nextScene);
    }
  }
}
