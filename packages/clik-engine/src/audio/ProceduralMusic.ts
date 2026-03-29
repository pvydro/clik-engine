/**
 * Dynamic procedural music generation via Web Audio API.
 * No loaded samples required — synthesizes all sounds from oscillators.
 * Supports mood-based variation and intensity-driven density.
 */
export class ProceduralMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number;
  private bpm: number;
  private stepTime: number;
  private playing = false;
  private mood: 'menu' | 'game' | 'gameover' | 'victory' = 'menu';
  private intensity = 0.3;
  private step = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Musical data
  private readonly menuChords = [
    [130.81, 164.81, 196.00],  // C3-E3-G3
    [110.00, 138.59, 164.81],  // A2-C#3-E3
    [146.83, 185.00, 220.00],  // D3-F#3-A3
    [123.47, 155.56, 196.00],  // B2-Eb3-G3
  ];
  private readonly gameNotes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63];
  private readonly arpPatterns = [0, 2, 4, 7, 4, 2]; // scale degrees

  constructor(config?: { bpm?: number; volume?: number }) {
    this.bpm = config?.bpm ?? 110;
    this.volume = config?.volume ?? 0.1;
    this.stepTime = 60 / this.bpm / 4; // 16th note duration
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

  /** Start playing with a mood */
  play(mood: 'menu' | 'game' | 'gameover' | 'victory'): void {
    if (this.playing) this.stop();
    if (!this.ensureContext()) return;

    this.mood = mood;
    this.playing = true;
    this.step = 0;

    this.intervalId = setInterval(() => {
      this.tick();
      this.step++;
    }, this.stepTime * 1000);
  }

  /** Stop with optional fade */
  stop(fadeMs?: number): void {
    if (!this.playing) return;

    if (fadeMs && this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
      setTimeout(() => {
        this.cleanup();
        if (this.masterGain) this.masterGain.gain.value = this.volume;
      }, fadeMs);
    } else {
      this.cleanup();
    }
  }

  /** Set intensity 0-1 (drives musical density) */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private tick(): void {
    if (!this.ctx || !this.masterGain) return;

    switch (this.mood) {
      case 'menu': this.tickMenu(); break;
      case 'game': this.tickGame(); break;
      case 'gameover': this.tickGameOver(); break;
      case 'victory': this.tickVictory(); break;
    }
  }

  private tickMenu(): void {
    // Pad chord every 16 steps
    if (this.step % 16 === 0) {
      const chord = this.menuChords[Math.floor(this.step / 16) % this.menuChords.length];
      for (const freq of chord) {
        this.warmPad(freq, 6, 0.03);
      }
    }

    // Soft arp every 8 steps
    if (this.step % 8 === 0) {
      const noteIdx = this.arpPatterns[Math.floor(this.step / 8) % this.arpPatterns.length];
      const freq = this.gameNotes[noteIdx % this.gameNotes.length] * 2;
      this.softPluck(freq, 2, 0.02);
    }
  }

  private tickGame(): void {
    // Bass on beats 0 and 8 (half notes)
    if (this.step % 8 === 0) {
      const bassNote = this.gameNotes[this.step % 2 === 0 ? 0 : 3];
      this.bass(bassNote / 2, 6, 0.05 + this.intensity * 0.02);
    }

    // Kick drum when intensity > 0.5
    if (this.intensity > 0.5 && this.step % 4 === 0) {
      this.kick(0.04 + this.intensity * 0.02);
    }

    // Arp — density increases with intensity
    const arpFrequency = this.intensity < 0.3 ? 8 : this.intensity < 0.6 ? 4 : 2;
    if (this.step % arpFrequency === 0) {
      const noteIdx = this.arpPatterns[this.step % this.arpPatterns.length];
      const freq = this.gameNotes[noteIdx % this.gameNotes.length] * 2;
      this.softPluck(freq, 1.5, 0.03 + this.intensity * 0.01);
    }

    // Sub bass drone when intensity > 0.7
    if (this.intensity > 0.7 && this.step % 32 === 0) {
      this.warmPad(32.70, 8, 0.02); // C1
    }

    // Pad chords every 16 steps
    if (this.step % 16 === 0) {
      const chordIdx = Math.floor(this.step / 16) % this.menuChords.length;
      const chord = this.menuChords[chordIdx];
      for (const freq of chord) {
        this.warmPad(freq, 4, 0.015 + this.intensity * 0.005);
      }
    }
  }

  private tickGameOver(): void {
    // Slow, sparse, minor pads
    if (this.step % 24 === 0) {
      const minorChord = [110, 130.81, 164.81]; // Am
      for (const freq of minorChord) {
        this.warmPad(freq, 8, 0.025);
      }
    }
  }

  private tickVictory(): void {
    // Bright, fast arps
    if (this.step % 4 === 0) {
      const noteIdx = this.step % this.gameNotes.length;
      this.softPluck(this.gameNotes[noteIdx] * 2, 1, 0.04);
    }
    if (this.step % 16 === 0) {
      const chord = this.menuChords[0]; // Major chord
      for (const freq of chord) {
        this.warmPad(freq * 2, 4, 0.03);
      }
    }
  }

  // === Synthesis Methods ===

  private warmPad(freq: number, durationSteps: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const dur = durationSteps * this.stepTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    // Fade in and out
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.3));
    gain.gain.linearRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private softPluck(freq: number, durationSteps: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const dur = durationSteps * this.stepTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + dur);

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private bass(freq: number, durationSteps: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const dur = durationSteps * this.stepTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private kick(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.playing = false;
    this.step = 0;
  }

  destroy(): void {
    this.cleanup();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
