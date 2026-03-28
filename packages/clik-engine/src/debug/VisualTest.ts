import { ConsoleReporter } from './ConsoleReporter';

/**
 * Visual regression testing utilities.
 * Captures canvas screenshots and compares against baselines.
 * Designed to work with Claude's Preview MCP tools.
 *
 * Usage with Preview MCP:
 * 1. preview_screenshot() to capture current state
 * 2. Compare visually or use pixel comparison
 * 3. Log differences via ConsoleReporter
 */
export const VisualTest = {
  /**
   * Capture the current canvas as a data URL.
   * Can be used to store baseline screenshots.
   */
  captureCanvas(): string | null {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      ConsoleReporter.error('VisualTest: no canvas found');
      return null;
    }
    return canvas.toDataURL('image/png');
  },

  /**
   * Save a baseline screenshot to localStorage.
   */
  saveBaseline(name: string): void {
    const data = VisualTest.captureCanvas();
    if (data) {
      localStorage.setItem(`__clik_vt_${name}`, data);
      ConsoleReporter.engine(`VisualTest: baseline saved — ${name}`);
    }
  },

  /**
   * Load a baseline screenshot from localStorage.
   */
  loadBaseline(name: string): string | null {
    return localStorage.getItem(`__clik_vt_${name}`);
  },

  /**
   * Compare current canvas against a saved baseline.
   * Returns a similarity score (0-1, where 1 = identical).
   * Uses pixel sampling for performance.
   */
  async compareToBaseline(name: string, sampleRate = 10): Promise<{ match: number; diffCount: number } | null> {
    const baseline = VisualTest.loadBaseline(name);
    if (!baseline) {
      ConsoleReporter.error(`VisualTest: no baseline found for '${name}'`);
      return null;
    }

    const current = VisualTest.captureCanvas();
    if (!current) return null;

    return VisualTest.compareImages(baseline, current, sampleRate);
  },

  /**
   * Compare two data URL images by pixel sampling.
   */
  async compareImages(
    imgA: string,
    imgB: string,
    sampleRate = 10,
    threshold = 30,
  ): Promise<{ match: number; diffCount: number }> {
    const [a, b] = await Promise.all([
      VisualTest.loadImage(imgA),
      VisualTest.loadImage(imgB),
    ]);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    canvas.width = w;
    canvas.height = h;

    // Get pixel data for image A
    ctx.drawImage(a, 0, 0);
    const dataA = ctx.getImageData(0, 0, w, h).data;

    // Get pixel data for image B
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(b, 0, 0);
    const dataB = ctx.getImageData(0, 0, w, h).data;

    let sampled = 0;
    let diffCount = 0;

    for (let y = 0; y < h; y += sampleRate) {
      for (let x = 0; x < w; x += sampleRate) {
        const idx = (y * w + x) * 4;
        const dr = Math.abs(dataA[idx] - dataB[idx]);
        const dg = Math.abs(dataA[idx + 1] - dataB[idx + 1]);
        const db = Math.abs(dataA[idx + 2] - dataB[idx + 2]);

        sampled++;
        if (dr + dg + db > threshold) {
          diffCount++;
        }
      }
    }

    const match = sampled > 0 ? 1 - diffCount / sampled : 1;
    ConsoleReporter.engine(`VisualTest: match=${(match * 100).toFixed(1)}% (${diffCount}/${sampled} pixels differ)`);

    return { match, diffCount };
  },

  /** Load an image from a data URL */
  loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  },

  /** Clear all baselines */
  clearBaselines(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('__clik_vt_'));
    for (const key of keys) localStorage.removeItem(key);
    ConsoleReporter.engine(`VisualTest: cleared ${keys.length} baselines`);
  },

  /** List all saved baseline names */
  listBaselines(): string[] {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('__clik_vt_'))
      .map(k => k.replace('__clik_vt_', ''));
  },
};
