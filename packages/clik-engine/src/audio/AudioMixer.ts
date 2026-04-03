/**
 * Audio mixer with ducking support.
 * Automatically lowers music volume when loud SFX play.
 *
 * Usage:
 * ```
 * const mixer = new AudioMixer(scene);
 * mixer.setDuckProfile('combat', { targetVolume: 0.3, attackMs: 50, releaseMs: 500 });
 * mixer.duck('combat'); // lower music
 * mixer.release('combat'); // restore music
 * ```
 */

export interface DuckProfile {
  /** Volume to duck to (0-1, relative to current music volume) */
  targetVolume: number;
  /** How fast to duck in ms */
  attackMs: number;
  /** How fast to restore in ms */
  releaseMs: number;
}

export class AudioMixer {
  private scene: Phaser.Scene;
  private profiles: Map<string, DuckProfile> = new Map();
  private activeDucks: Set<string> = new Set();
  private originalMusicVolume = 1;
  private currentDuckVolume = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Register a duck profile */
  setDuckProfile(name: string, profile: DuckProfile): this {
    this.profiles.set(name, profile);
    return this;
  }

  /** Activate ducking */
  duck(profileName: string): void {
    const profile = this.profiles.get(profileName);
    if (!profile) return;
    if (this.activeDucks.size === 0) {
      this.originalMusicVolume = this.getMusicVolume();
    }
    this.activeDucks.add(profileName);
    this.applyDuck();
  }

  /** Release ducking */
  release(profileName: string): void {
    this.activeDucks.delete(profileName);
    if (this.activeDucks.size === 0) {
      this.restoreVolume();
    } else {
      this.applyDuck();
    }
  }

  /** Release all active ducks */
  releaseAll(): void {
    this.activeDucks.clear();
    this.restoreVolume();
  }

  /** Check if any duck is active */
  get isDucking(): boolean {
    return this.activeDucks.size > 0;
  }

  /** Get current duck volume multiplier */
  getDuckVolume(): number {
    return this.currentDuckVolume;
  }

  /** Get all registered profile names */
  getProfileNames(): string[] {
    return Array.from(this.profiles.keys());
  }

  /** Get active duck names */
  getActiveDucks(): string[] {
    return Array.from(this.activeDucks);
  }

  private applyDuck(): void {
    // Use the lowest target volume from all active ducks
    let lowestVolume = 1;
    for (const name of this.activeDucks) {
      const profile = this.profiles.get(name);
      if (profile && profile.targetVolume < lowestVolume) {
        lowestVolume = profile.targetVolume;
      }
    }
    this.currentDuckVolume = lowestVolume;
    this.setMusicVolume(this.originalMusicVolume * lowestVolume);
  }

  private restoreVolume(): void {
    this.currentDuckVolume = 1;
    this.setMusicVolume(this.originalMusicVolume);
  }

  private getMusicVolume(): number {
    // Access Phaser sound manager volume
    return (this.scene.sound as Phaser.Sound.BaseSoundManager & { volume?: number }).volume ?? 1;
  }

  private setMusicVolume(volume: number): void {
    (this.scene.sound as Phaser.Sound.BaseSoundManager & { volume?: number }).volume = volume;
  }
}
