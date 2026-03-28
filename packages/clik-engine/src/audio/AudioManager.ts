import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export class AudioManager {
  private game: Phaser.Game;
  private musicVolume = 1;
  private sfxVolume = 1;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private muted = false;
  private unlocked = false;

  constructor(game: Phaser.Game) {
    this.game = game;

    // Handle audio unlock on first user interaction
    if (game.sound.locked) {
      game.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.unlocked = true;
        ConsoleReporter.audio('Audio context unlocked');
      });
    } else {
      this.unlocked = true;
    }
  }

  playMusic(key: string, config?: { loop?: boolean; volume?: number; fadeIn?: number }): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
    }

    const volume = (config?.volume ?? 1) * this.musicVolume;
    this.currentMusic = this.game.sound.add(key, {
      loop: config?.loop ?? true,
      volume: config?.fadeIn ? 0 : volume,
    });

    this.currentMusic.play();

    if (config?.fadeIn && this.currentMusic instanceof Phaser.Sound.WebAudioSound) {
      this.game.tweens.add({
        targets: this.currentMusic,
        volume,
        duration: config.fadeIn,
      });
    }

    ConsoleReporter.audio(`Playing music: ${key}`, { loop: config?.loop ?? true, volume });
  }

  stopMusic(fadeOut?: number): void {
    if (!this.currentMusic) return;

    if (fadeOut && this.currentMusic instanceof Phaser.Sound.WebAudioSound) {
      this.game.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: fadeOut,
        onComplete: () => {
          this.currentMusic?.stop();
          this.currentMusic?.destroy();
          this.currentMusic = null;
        },
      });
    } else {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }

    ConsoleReporter.audio('Music stopped');
  }

  playSfx(key: string, config?: { volume?: number; detune?: number }): void {
    const volume = (config?.volume ?? 1) * this.sfxVolume;
    this.game.sound.play(key, { volume, detune: config?.detune });
    ConsoleReporter.audio(`SFX: ${key}`, { volume });
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.currentMusic && 'volume' in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).volume = this.musicVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.game.sound.mute = this.muted;
    ConsoleReporter.audio(`Muted: ${this.muted}`);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
