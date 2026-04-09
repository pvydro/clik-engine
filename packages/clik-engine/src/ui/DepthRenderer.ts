import type Phaser from 'phaser';

export interface DepthPanelConfig {
  fillColor?: number;
  cornerRadius?: number;
  shadow?: { offsetX?: number; offsetY?: number; alpha?: number; color?: number } | false;
  border?: { color?: number; alpha?: number; width?: number } | false;
  highlight?: { alpha?: number; height?: number } | false;
  glow?: { color?: number; alpha?: number; width?: number } | false;
}

export interface DepthCellConfig {
  fillColor?: number;
  cornerRadius?: number;
  shadow?: { offsetX?: number; offsetY?: number; alpha?: number } | false;
  highlight?: { alpha?: number; height?: number } | false;
}

export interface DepthGridConfig {
  padding?: number;
  cellPadding?: number;
  rows?: number;
  panelConfig?: DepthPanelConfig;
  cellConfig?: DepthCellConfig;
}

/**
 * Static utility for drawing visually rich panels, cells, and grids
 * with layered shadows, highlights, and borders for depth.
 */
export const DepthRenderer = {
  /**
   * Draw a rounded rect with shadow, fill, border, and top-edge highlight.
   */
  drawPanel(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    config?: DepthPanelConfig,
  ): void {
    const fill = config?.fillColor ?? 0x12121f;
    const cr = config?.cornerRadius ?? 14;

    // Shadow
    if (config?.shadow !== false) {
      const s = typeof config?.shadow === 'object' ? config.shadow : {};
      const ox = s.offsetX ?? 3;
      const oy = s.offsetY ?? 4;
      const sa = s.alpha ?? 0.3;
      const sc = s.color ?? 0x000000;
      gfx.fillStyle(sc, sa);
      gfx.fillRoundedRect(x + ox, y + oy, w, h, cr);
    }

    // Main fill
    gfx.fillStyle(fill, 1);
    gfx.fillRoundedRect(x, y, w, h, cr);

    // Outer glow line
    if (config?.glow !== false && config?.glow) {
      const g = config.glow;
      gfx.lineStyle(g.width ?? 1, g.color ?? 0x00fff0, g.alpha ?? 0.08);
      gfx.strokeRoundedRect(x, y, w, h, cr);
    }

    // Border
    if (config?.border !== false && config?.border) {
      const b = config.border;
      gfx.lineStyle(b.width ?? 2, b.color ?? 0x00fff0, b.alpha ?? 0.4);
      gfx.strokeRoundedRect(x, y, w, h, cr);
    }

    // Top-edge inner highlight (bevel)
    if (config?.highlight !== false) {
      const hl = typeof config?.highlight === 'object' ? config.highlight : {};
      const ha = hl.alpha ?? 0.02;
      const hh = hl.height ?? 0.3;
      gfx.fillStyle(0xffffff, ha);
      gfx.fillRoundedRect(x + 2, y + 2, w - 4, h * hh, { tl: cr - 2, tr: cr - 2, bl: 0, br: 0 });
    }
  },

  /**
   * Draw an inset cell (for grid slots, card placeholders).
   */
  drawCell(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    config?: DepthCellConfig,
  ): void {
    const fill = config?.fillColor ?? 0x12121f;
    const cr = config?.cornerRadius ?? 10;

    // Cell shadow (inset effect)
    if (config?.shadow !== false) {
      const s = typeof config?.shadow === 'object' ? config.shadow : {};
      const ox = s.offsetX ?? 1;
      const oy = s.offsetY ?? 1;
      const sa = s.alpha ?? 0.3;
      gfx.fillStyle(0x000000, sa);
      gfx.fillRoundedRect(x + ox, y + oy, w, h, cr);
    }

    // Cell fill
    gfx.fillStyle(fill, 1);
    gfx.fillRoundedRect(x, y, w, h, cr);

    // Top-edge highlight
    if (config?.highlight !== false) {
      const hl = typeof config?.highlight === 'object' ? config.highlight : {};
      const ha = hl.alpha ?? 0.02;
      const hh = hl.height ?? 0.35;
      gfx.fillStyle(0xffffff, ha);
      gfx.fillRoundedRect(x + 1, y + 1, w - 2, h * hh, { tl: cr - 1, tr: cr - 1, bl: 0, br: 0 });
    }
  },

  /**
   * Draw a complete grid background with N×M inset cells.
   * @param cols Number of columns
   * @param cellSize Size of each cell (square)
   * @param config Grid configuration
   */
  drawGrid(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number,
    cols: number, cellSize: number,
    config?: DepthGridConfig,
  ): void {
    const rows = config?.rows ?? cols;
    const pad = config?.padding ?? 8;
    const cellPad = config?.cellPadding ?? 5;
    const totalW = cols * cellSize + (cols - 1) * cellPad + pad * 2;
    const totalH = rows * cellSize + (rows - 1) * cellPad + pad * 2;

    // Draw panel background
    DepthRenderer.drawPanel(gfx, x, y, totalW, totalH, {
      fillColor: 0x0a0a0f,
      cornerRadius: 14,
      shadow: { offsetX: 3, offsetY: 4, alpha: 0.3 },
      glow: { color: 0x00fff0, alpha: 0.08 },
      highlight: { alpha: 0.02, height: 0.3 },
      ...config?.panelConfig,
    });

    // Draw individual cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + pad + c * (cellSize + cellPad);
        const cy = y + pad + r * (cellSize + cellPad);
        DepthRenderer.drawCell(gfx, cx, cy, cellSize, cellSize, {
          fillColor: 0x12121f,
          cornerRadius: 10,
          shadow: { offsetX: 1, offsetY: 1, alpha: 0.3 },
          highlight: { alpha: 0.02, height: 0.35 },
          ...config?.cellConfig,
        });
      }
    }
  },
};
