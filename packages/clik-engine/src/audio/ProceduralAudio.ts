/**
 * Procedural sound effects via Web Audio API.
 * No loaded samples required — generates all sounds from oscillators and noise.
 */
export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number;
  private muted = false;

  constructor(config?: { volume?: number }) {
    this.volume = config?.volume ?? 0.5;
  }

  private ensureContext(): boolean {
    if (this.ctx) return true;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : this.volume;
  }

  /**
   * Play a single tone with exponential decay.
   */
  tone(config: {
    frequency: number;
    type?: OscillatorType;
    duration?: number;
    volume?: number;
    delay?: number;
  }): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime + (config.delay ?? 0);
    const dur = config.duration ?? 0.12;
    const vol = config.volume ?? 0.25;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = config.type ?? 'sine';
    osc.frequency.value = config.frequency;

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  /**
   * Play noise burst (for explosions, impacts).
   */
  noise(config?: { duration?: number; volume?: number }): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;

    const dur = config?.duration ?? 0.3;
    const vol = config?.volume ?? 0.35;
    const t = this.ctx.currentTime;

    const bufferSize = Math.round(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
  }

  // === Game-Feel Sound Presets ===

  /** Merge sound: tier-scaled frequency + harmonic */
  merge(tier: number): void {
    const baseFreq = 300 + tier * 60;
    this.tone({ frequency: baseFreq, type: 'sine', duration: 0.12, volume: 0.25 });
    this.tone({ frequency: baseFreq * 1.5, type: 'sine', duration: 0.08, volume: 0.08 });
  }

  /** Chain reaction: combo-scaled ascending pitch */
  chain(combo: number): void {
    const freq = 400 + combo * 80;
    this.tone({ frequency: freq, type: 'sine', duration: 0.15, volume: 0.3 });
    this.tone({ frequency: freq * 2, type: 'triangle', duration: 0.1, volume: 0.1 });
  }

  /** Combo popup: 3-note ascending arpeggio */
  comboPopup(combo: number): void {
    const base = 500 + combo * 50;
    for (let i = 0; i < 3; i++) {
      this.tone({ frequency: base + i * 100, type: 'sine', duration: 0.12, volume: 0.15, delay: i * 0.06 });
    }
  }

  /** Soft spawn tick */
  spawn(): void {
    this.tone({ frequency: 800, type: 'sine', duration: 0.05, volume: 0.1 });
    this.tone({ frequency: 1200, type: 'sine', duration: 0.03, volume: 0.05 });
  }

  /** Quick slide swoosh */
  slide(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /** UI click */
  click(): void {
    this.tone({ frequency: 600, type: 'sine', duration: 0.06, volume: 0.2 });
    this.tone({ frequency: 900, type: 'sine', duration: 0.04, volume: 0.08 });
  }

  /** Game over: descending 4-note sequence */
  gameOver(): void {
    const notes = [400, 350, 300, 200];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ frequency: notes[i], type: 'sine', duration: 0.4, volume: 0.2, delay: i * 0.2 });
    }
  }

  /** Victory fanfare: ascending 5-note with harmonics */
  victory(): void {
    const notes = [400, 500, 600, 800, 1000];
    for (let i = 0; i < notes.length; i++) {
      this.tone({ frequency: notes[i], type: 'sine', duration: 0.3, volume: 0.2, delay: i * 0.12 });
      this.tone({ frequency: notes[i] * 2, type: 'sine', duration: 0.2, volume: 0.1, delay: i * 0.12 });
    }
  }

  /** Explosion: noise + deep sine */
  explosion(): void {
    this.noise({ duration: 0.3, volume: 0.35 });
    this.tone({ frequency: 60, type: 'sine', duration: 0.4, volume: 0.4 });
    this.tone({ frequency: 40, type: 'sine', duration: 0.5, volume: 0.2 });
  }

  /** Shimmer (ice, magic, sparkle): detuned pair */
  shimmer(): void {
    this.tone({ frequency: 1200, type: 'sine', duration: 0.1, volume: 0.04 });
    this.tone({ frequency: 1220, type: 'sine', duration: 0.1, volume: 0.04 });
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
