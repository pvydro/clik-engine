import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { ProceduralAudio } from './ProceduralAudio';
import { ProceduralMusic } from './ProceduralMusic';

export class AudioManager {
  private scene: Phaser.Scene;
  private musicVolume = 1;
  private sfxVolume = 1;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey = '';
  private muted = false;
  private musicMuted = false;
  private sfxMuted = false;
  private unlocked = false;
  private _procedural: ProceduralAudio | null = null;
  private _proceduralMusic: ProceduralMusic | null = null;

  /** Lazy-initialized procedural sound effects (Web Audio synthesis) */
  get procedural(): ProceduralAudio {
    if (!this._procedural) {
      this._procedural = new ProceduralAudio({ volume: this.sfxVolume });
    }
    return this._procedural;
  }

  /** Lazy-initialized procedural music generator */
  get proceduralMusic(): ProceduralMusic {
    if (!this._proceduralMusic) {
      this._proceduralMusic = new ProceduralMusic({ volume: this.musicVolume * 0.1 });
    }
    return this._proceduralMusic;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const game = scene.game;

    if (game.sound.locked) {
      game.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.unlocked = true;
        ConsoleReporter.audio('Audio context unlocked');
      });
    } else {
      this.unlocked = true;
    }
  }

  playMusic(key: string, config?: {
    loop?: boolean;
    volume?: number;
    fadeIn?: number;
    loopCount?: number;
  }): void {
    const volume = (config?.volume ?? 1) * this.musicVolume;

    // Cross-fade if music is already playing
    if (this.currentMusic && this.currentMusicKey !== key) {
      const oldMusic = this.currentMusic;
      this.scene.tweens.add({
        targets: oldMusic,
        volume: 0,
        duration: config?.fadeIn ? config.fadeIn / 2 : 200,
        onComplete: () => {
          oldMusic.stop();
          oldMusic.destroy();
        },
      });
    } else if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
    }

    const shouldLoop = config?.loopCount === undefined ? (config?.loop ?? true) : false;
    this.currentMusic = this.scene.sound.add(key, {
      loop: shouldLoop,
      volume: config?.fadeIn ? 0 : volume,
    });
    this.currentMusicKey = key;
    this.currentMusic.play();

    // Handle loop count (play N times then stop)
    if (config?.loopCount && config.loopCount > 1) {
      let plays = 1;
      this.currentMusic.on('complete', () => {
        plays++;
        if (plays < config.loopCount!) {
          this.currentMusic?.play();
        }
      });
    }

    if (config?.fadeIn) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume,
        duration: config.fadeIn,
      });
    }

    ConsoleReporter.audio(`Playing music: ${key}`, { loop: shouldLoop, volume });
  }

  stopMusic(fadeOut?: number): void {
    if (!this.currentMusic) return;

    if (fadeOut) {
      const music = this.currentMusic;
      this.scene.tweens.add({
        targets: music,
        volume: 0,
        duration: fadeOut,
        onComplete: () => {
          music.stop();
          music.destroy();
        },
      });
    } else {
      this.currentMusic.stop();
      this.currentMusic.destroy();
    }

    this.currentMusic = null;
    this.currentMusicKey = '';
    ConsoleReporter.audio('Music stopped');
  }

  playSfx(key: string, config?: {
    volume?: number;
    detune?: number;
    pan?: number;
    rate?: number;
  }): Phaser.Sound.BaseSound {
    if (this.sfxMuted) {
      return this.scene.sound.add(key); // return dummy
    }

    const volume = (config?.volume ?? 1) * this.sfxVolume;
    const sound = this.scene.sound.add(key, {
      volume,
      detune: config?.detune,
      rate: config?.rate,
    });
    sound.play();
    ConsoleReporter.audio(`SFX: ${key}`, { volume });
    return sound;
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

  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    ConsoleReporter.audio(`Muted: ${this.muted}`);
    return this.muted;
  }

  muteMusic(mute = true): void {
    this.musicMuted = mute;
    if (this.currentMusic && 'volume' in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).volume = mute ? 0 : this.musicVolume;
    }
  }

  muteSfx(mute = true): void {
    this.sfxMuted = mute;
  }

  isMuted(): boolean { return this.muted; }
  isMusicMuted(): boolean { return this.musicMuted; }
  isSfxMuted(): boolean { return this.sfxMuted; }

  isPlaying(): boolean {
    return this.currentMusic?.isPlaying ?? false;
  }
}
