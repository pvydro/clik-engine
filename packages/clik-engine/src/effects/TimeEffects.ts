import Phaser from 'phaser';

/**
 * Time manipulation effects: hitstop, slow-motion, and gradual resume.
 *
 * Usage:
 * ```
 * const time = new TimeEffects(scene);
 * time.hitstop(3);                    // freeze for 3 frames
 * time.slowMo(0.3, 2000);            // 30% speed for 2 seconds
 * time.slowMo(0.3, 2000, 'gradual'); // gradual resume over 2s
 * ```
 */
export class TimeEffects {
  private scene: Phaser.Scene;
  private hitstopFrames = 0;
  private originalTimeScale = 1;
  private slowMoActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Freeze the game for N frames (hitstop/hitfreeze).
   * Pauses physics and scene updates, then resumes.
   */
  hitstop(frames: number): void {
    this.hitstopFrames = frames;
    this.originalTimeScale = this.scene.time.timeScale;
    this.scene.time.timeScale = 0;
    this.scene.physics?.world?.pause?.();

    this.tickHitstop();
  }

  /**
   * Slow-motion effect.
   * @param scale Time scale (0.1 = very slow, 0.5 = half speed)
   * @param duration How long the slow-mo lasts in real-time ms
   * @param resumeMode 'instant' = snap back, 'gradual' = smooth ramp to normal
   */
  slowMo(scale: number, duration: number, resumeMode: 'instant' | 'gradual' = 'instant'): void {
    if (this.slowMoActive) return;
    this.slowMoActive = true;
    this.originalTimeScale = this.scene.time.timeScale;
    this.scene.time.timeScale = scale;

    if (resumeMode === 'instant') {
      this.scene.time.delayedCall(duration * scale, () => {
        this.scene.time.timeScale = this.originalTimeScale;
        this.slowMoActive = false;
      });
    } else {
      // Gradual resume: ramp from scale to 1 over the duration
      const startScale = scale;
      const rampStart = Date.now();

      const rampTimer = this.scene.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const elapsed = Date.now() - rampStart;
          const t = Math.min(1, elapsed / duration);
          this.scene.time.timeScale = startScale + (this.originalTimeScale - startScale) * t;

          if (t >= 1) {
            rampTimer.destroy();
            this.slowMoActive = false;
          }
        },
      });
    }
  }

  /** Get current time scale */
  getTimeScale(): number {
    return this.scene.time.timeScale;
  }

  /** Whether hitstop is active */
  get isHitstopActive(): boolean {
    return this.hitstopFrames > 0;
  }

  /** Whether slow-mo is active */
  get isSlowMoActive(): boolean {
    return this.slowMoActive;
  }

  /** Force resume to normal speed */
  resume(): void {
    this.hitstopFrames = 0;
    this.slowMoActive = false;
    this.scene.time.timeScale = this.originalTimeScale;
    this.scene.physics?.world?.resume?.();
  }

  private tickHitstop(): void {
    // Use requestAnimationFrame to count real frames during pause
    if (this.hitstopFrames <= 0) {
      this.scene.time.timeScale = this.originalTimeScale;
      this.scene.physics?.world?.resume?.();
      return;
    }

    this.hitstopFrames--;
    // Schedule next check on next animation frame
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.tickHitstop());
    } else {
      // Fallback for test environments
      this.scene.time.timeScale = this.originalTimeScale;
      this.scene.physics?.world?.resume?.();
    }
  }
}
