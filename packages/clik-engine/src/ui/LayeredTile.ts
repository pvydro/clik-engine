import Phaser from 'phaser';
import { Color } from '../utils/color';

export interface LayeredTileConfig {
  size: number;
  color: number;
  cornerRadius?: number;
  label?: string;
  labelStyle?: Partial<Phaser.Types.GameObjects.Text.TextStyle>;
  shape?: { type: 'circle' | 'polygon'; sides?: number; radius?: number };
  shadow?: { offsetX?: number; offsetY?: number; alpha?: number } | false;
  glow?: { expand?: number; alpha?: number } | false;
  highlight?: { alpha?: number; height?: number } | false;
  border?: { width?: number; alpha?: number } | false;
}

/**
 * A tile/card with 5 layered graphics for visual depth:
 * shadow, glow, background (with bevel), central shape, and label.
 */
export class LayeredTile extends Phaser.GameObjects.Container {
  private config: Required<Pick<LayeredTileConfig, 'size' | 'color' | 'cornerRadius'>>;
  private shadowGfx: Phaser.GameObjects.Graphics;
  private glowGfx: Phaser.GameObjects.Graphics;
  private bgGfx: Phaser.GameObjects.Graphics;
  private shapeGfx: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private idleTweens: Phaser.Tweens.Tween[] = [];
  private fullConfig: LayeredTileConfig;

  constructor(scene: Phaser.Scene, cfg: LayeredTileConfig) {
    super(scene, 0, 0);
    this.fullConfig = cfg;
    this.config = {
      size: cfg.size,
      color: cfg.color,
      cornerRadius: cfg.cornerRadius ?? 10,
    };

    this.shadowGfx = scene.add.graphics();
    this.glowGfx = scene.add.graphics();
    this.bgGfx = scene.add.graphics();
    this.shapeGfx = scene.add.graphics();
    this.labelText = scene.add.text(0, 0, '', {
      fontSize: `${Math.round(cfg.size * 0.35)}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      ...cfg.labelStyle,
    }).setOrigin(0.5);

    this.add([this.shadowGfx, this.glowGfx, this.bgGfx, this.shapeGfx, this.labelText]);
    scene.add.existing(this);

    this.draw(cfg);
  }

  /**
   * Redraw the tile with updated config (partial updates supported).
   */
  redraw(cfg?: Partial<LayeredTileConfig>): void {
    if (cfg) {
      this.fullConfig = { ...this.fullConfig, ...cfg };
      if (cfg.size !== undefined) this.config.size = cfg.size;
      if (cfg.color !== undefined) this.config.color = cfg.color;
      if (cfg.cornerRadius !== undefined) this.config.cornerRadius = cfg.cornerRadius;
    }
    this.draw(this.fullConfig);
  }

  /**
   * Convenience for tier-based games: update color, label, and optional shape.
   */
  setTier(color: number, label?: string, shape?: LayeredTileConfig['shape']): void {
    this.redraw({ color, label, shape });
  }

  /**
   * Start shape scale pulsing (breathing idle animation).
   */
  breathing(config?: { scale?: number; duration?: number }): void {
    const scale = config?.scale ?? 1.08;
    const duration = config?.duration ?? (800 + Math.random() * 400);
    const tw = this.scene.tweens.add({
      targets: this.shapeGfx,
      scaleX: scale,
      scaleY: scale,
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.idleTweens.push(tw);
  }

  /**
   * Start glow alpha pulsing.
   */
  glowPulse(config?: { minAlpha?: number; duration?: number }): void {
    const minAlpha = config?.minAlpha ?? 0.4;
    const duration = config?.duration ?? (1200 + Math.random() * 400);
    const tw = this.scene.tweens.add({
      targets: this.glowGfx,
      alpha: minAlpha,
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.idleTweens.push(tw);
  }

  /**
   * Stop all idle animations.
   */
  stopAnimations(): void {
    for (const tw of this.idleTweens) {
      tw.stop();
      tw.destroy();
    }
    this.idleTweens = [];
    this.shapeGfx.setScale(1);
    this.glowGfx.setAlpha(1);
  }

  private draw(cfg: LayeredTileConfig): void {
    const { size, color, cornerRadius: cr } = this.config;
    const half = size / 2;

    // Clear all
    this.shadowGfx.clear();
    this.glowGfx.clear();
    this.bgGfx.clear();
    this.shapeGfx.clear();

    // 1. Shadow
    if (cfg.shadow !== false) {
      const s = typeof cfg.shadow === 'object' ? cfg.shadow : {};
      const ox = s.offsetX ?? 2;
      const oy = s.offsetY ?? 3;
      const sa = s.alpha ?? 0.25;
      this.shadowGfx.fillStyle(0x000000, sa);
      this.shadowGfx.fillRoundedRect(-half + ox, -half + oy, size, size, cr);
    }

    // 2. Glow
    if (cfg.glow !== false) {
      const g = typeof cfg.glow === 'object' ? cfg.glow : {};
      const expand = g.expand ?? 8;
      const ga = g.alpha ?? 0.06;
      this.glowGfx.fillStyle(color, ga);
      this.glowGfx.fillRoundedRect(-half - expand / 2, -half - expand / 2, size + expand, size + expand, cr + 2);
    }

    // 3. Background with border and inner highlight
    // Main fill
    this.bgGfx.fillStyle(color, 0.22);
    this.bgGfx.fillRoundedRect(-half, -half, size, size, cr);

    // Border
    if (cfg.border !== false) {
      const b = typeof cfg.border === 'object' ? cfg.border : {};
      const bw = b.width ?? 2;
      const ba = b.alpha ?? 0.8;
      this.bgGfx.lineStyle(bw, color, ba);
      this.bgGfx.strokeRoundedRect(-half, -half, size, size, cr);
    }

    // Inner highlight (top bevel)
    if (cfg.highlight !== false) {
      const hl = typeof cfg.highlight === 'object' ? cfg.highlight : {};
      const ha = hl.alpha ?? 0.06;
      const hh = hl.height ?? 0.4;
      this.bgGfx.fillStyle(0xffffff, ha);
      this.bgGfx.fillRoundedRect(-half + 2, -half + 2, size - 4, size * hh, { tl: cr - 2, tr: cr - 2, bl: 0, br: 0 });
    }

    // 4. Central shape
    if (cfg.shape) {
      const shapeRadius = cfg.shape.radius ?? size * 0.15;

      // Shape shadow
      this.shapeGfx.fillStyle(0x000000, 0.2);
      if (cfg.shape.type === 'circle') {
        this.shapeGfx.fillCircle(1, 2, shapeRadius);
      } else {
        this.drawPolygon(this.shapeGfx, 1, 2, shapeRadius, cfg.shape.sides ?? 6, 0x000000, 0.2);
      }

      // Main shape
      if (cfg.shape.type === 'circle') {
        this.shapeGfx.fillStyle(color, 0.9);
        this.shapeGfx.fillCircle(0, 0, shapeRadius);
        // Highlight spot
        this.shapeGfx.fillStyle(0xffffff, 0.2);
        this.shapeGfx.fillCircle(-shapeRadius * 0.3, -shapeRadius * 0.3, shapeRadius * 0.3);
      } else {
        this.drawPolygon(this.shapeGfx, 0, 0, shapeRadius, cfg.shape.sides ?? 6, color, 0.9);
      }
    }

    // 5. Label
    if (cfg.label !== undefined) {
      this.labelText.setText(cfg.label);
      this.labelText.setVisible(true);
      // Auto-scale font for long labels
      const maxW = size * 0.8;
      if (this.labelText.width > maxW) {
        const scale = maxW / this.labelText.width;
        this.labelText.setScale(scale);
      } else {
        this.labelText.setScale(1);
      }
    } else {
      this.labelText.setVisible(false);
    }
  }

  private drawPolygon(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number, radius: number, sides: number,
    color: number, alpha: number,
  ): void {
    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath();
  }

  destroy(fromScene?: boolean): void {
    this.stopAnimations();
    super.destroy(fromScene);
  }
}
