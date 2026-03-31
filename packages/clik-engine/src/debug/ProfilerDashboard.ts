import Phaser from 'phaser';
import { profiler } from './Profiler';

/**
 * Visual profiler overlay scene. Shows FPS graph, section timing bars, and frame stats.
 * Toggle with F3 key or call show()/hide().
 */
export class ProfilerDashboard extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;
  private sectionTexts: Phaser.GameObjects.Text[] = [];
  private fpsGraph!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Rectangle;
  private visible = false;
  private toggleKey: Phaser.Input.Keyboard.Key | null = null;
  private fpsHistory: number[] = [];
  private updateCounter = 0;

  constructor() {
    super({ key: '__clik_profiler_dashboard' });
  }

  create(): void {
    const w = 280;
    const h = 200;
    const x = this.scale.width - w - 10;
    const y = 10;

    this.panel = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.85)
      .setDepth(99990)
      .setScrollFactor(0)
      .setVisible(false);

    this.fpsText = this.add.text(x + 8, y + 8, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#00ff88',
    }).setDepth(99991).setScrollFactor(0).setVisible(false);

    this.fpsGraph = this.add.graphics()
      .setDepth(99991)
      .setScrollFactor(0)
      .setVisible(false);

    // Toggle key
    if (this.input.keyboard) {
      this.toggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    }
  }

  update(): void {
    // Check toggle
    if (this.toggleKey?.isDown && this.updateCounter > 10) {
      this.visible = !this.visible;
      this.panel.setVisible(this.visible);
      this.fpsText.setVisible(this.visible);
      this.fpsGraph.setVisible(this.visible);
      for (const t of this.sectionTexts) t.setVisible(this.visible);
      this.updateCounter = 0;
    }
    this.updateCounter++;

    if (!this.visible) return;

    // Update every 6 frames for readability
    if (this.updateCounter % 6 !== 0) return;

    const fps = Math.round(this.game.loop.actualFps);
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    const avgFrame = profiler.getAverageFrameTime();
    const summary = profiler.getTimingSummary();

    // Update text
    let text = `FPS: ${fps}  Frame: ${avgFrame.toFixed(1)}ms\n`;
    for (const [label, value] of Object.entries(summary)) {
      if (label === 'frame') continue;
      text += `${label}: ${value}\n`;
    }
    this.fpsText.setText(text);

    // Draw FPS graph
    this.drawFpsGraph();
  }

  show(): void {
    this.visible = true;
    this.panel.setVisible(true);
    this.fpsText.setVisible(true);
    this.fpsGraph.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.panel.setVisible(false);
    this.fpsText.setVisible(false);
    this.fpsGraph.setVisible(false);
  }

  private drawFpsGraph(): void {
    const g = this.fpsGraph;
    g.clear();

    if (this.fpsHistory.length < 2) return;

    const w = 260;
    const h = 40;
    const x = this.scale.width - 280;
    const y = 160;

    // Background
    g.fillStyle(0x111111, 0.5);
    g.fillRect(x, y, w, h);

    // FPS line
    g.lineStyle(1, 0x00ff88, 0.8);
    g.beginPath();
    for (let i = 0; i < this.fpsHistory.length; i++) {
      const px = x + (i / 59) * w;
      const py = y + h - (Math.min(this.fpsHistory[i], 60) / 60) * h;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();

    // 60fps target line
    g.lineStyle(1, 0x444444, 0.5);
    g.lineBetween(x, y, x + w, y);
  }
}
