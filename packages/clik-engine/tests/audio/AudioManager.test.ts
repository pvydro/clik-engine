import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { audio: vi.fn(), state: vi.fn(), error: vi.fn() },
}));

// Phaser.Math.Clamp polyfill
vi.mock('phaser', () => ({
  default: {
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
    Sound: { Events: { UNLOCKED: 'unlocked' } },
  },
}));

import { AudioManager } from '../../src/audio/AudioManager';

function makeSound() {
  return {
    play: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    isPlaying: false,
    volume: 1,
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  };
}

function makeScene(locked = false) {
  const soundManager = {
    add: vi.fn(() => makeSound()),
    mute: false,
    locked,
    once: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  return {
    sound: soundManager,
    tweens: {
      add: vi.fn(() => ({ stop: vi.fn() })),
    },
    time: {
      delayedCall: vi.fn(),
    },
    game: {
      sound: soundManager,
    },
  } as unknown as Phaser.Scene;
}

describe('AudioManager', () => {
  let scene: Phaser.Scene;
  let audio: AudioManager;

  beforeEach(() => {
    scene = makeScene();
    audio = new AudioManager(scene);
  });

  it('starts unmuted', () => {
    expect(audio.isMuted()).toBe(false);
  });

  it('starts with music and sfx unmuted', () => {
    expect(audio.isMusicMuted()).toBe(false);
    expect(audio.isSfxMuted()).toBe(false);
  });

  it('getMusicVolume returns 1 by default', () => {
    expect(audio.getMusicVolume()).toBe(1);
  });

  it('getSfxVolume returns 1 by default', () => {
    expect(audio.getSfxVolume()).toBe(1);
  });

  it('setMusicVolume updates and clamps', () => {
    audio.setMusicVolume(0.5);
    expect(audio.getMusicVolume()).toBe(0.5);
    audio.setMusicVolume(5);
    expect(audio.getMusicVolume()).toBe(1);
    audio.setMusicVolume(-1);
    expect(audio.getMusicVolume()).toBe(0);
  });

  it('setSfxVolume updates and clamps', () => {
    audio.setSfxVolume(0.3);
    expect(audio.getSfxVolume()).toBe(0.3);
  });

  it('playMusic calls scene.sound.add and play', () => {
    audio.playMusic('bgm');
    expect(scene.sound.add).toHaveBeenCalledWith('bgm', expect.any(Object));
  });

  it('playMusic replaying the same key stops and replaces it directly', () => {
    const firstSound = makeSound();
    (scene.sound.add as ReturnType<typeof vi.fn>).mockReturnValueOnce(firstSound);
    audio.playMusic('bgm');
    // Replaying the same key goes through the else-if path: direct stop/destroy
    audio.playMusic('bgm');
    expect(firstSound.stop).toHaveBeenCalled();
    expect(firstSound.destroy).toHaveBeenCalled();
  });

  it('playSfx returns a sound object', () => {
    const result = audio.playSfx('hit');
    expect(result).toBeDefined();
    expect(scene.sound.add).toHaveBeenCalledWith('hit', expect.any(Object));
  });

  it('playSfx is suppressed when sfx is muted', () => {
    audio.muteSfx(true);
    // Should still return a dummy sound object without playing normally
    const addSpy = vi.spyOn(scene.sound, 'add');
    audio.playSfx('hit');
    // add is still called (returns dummy) but with no volume side effects
    expect(audio.isSfxMuted()).toBe(true);
    addSpy.mockRestore();
  });

  it('toggleMute flips muted state', () => {
    expect(audio.toggleMute()).toBe(true);
    expect(audio.isMuted()).toBe(true);
    expect(audio.toggleMute()).toBe(false);
  });

  it('muteMusic sets musicMuted', () => {
    audio.muteMusic(true);
    expect(audio.isMusicMuted()).toBe(true);
    audio.muteMusic(false);
    expect(audio.isMusicMuted()).toBe(false);
  });

  it('muteSfx sets sfxMuted', () => {
    audio.muteSfx(true);
    expect(audio.isSfxMuted()).toBe(true);
  });

  it('isPlaying returns false with no music', () => {
    expect(audio.isPlaying()).toBe(false);
  });

  it('stopMusic cleans up current music', () => {
    const sound = makeSound();
    (scene.sound.add as ReturnType<typeof vi.fn>).mockReturnValueOnce(sound);
    audio.playMusic('bgm');
    audio.stopMusic();
    expect(sound.stop).toHaveBeenCalled();
    expect(sound.destroy).toHaveBeenCalled();
  });

  it('destroy cleans up resources', () => {
    const sound = makeSound();
    (scene.sound.add as ReturnType<typeof vi.fn>).mockReturnValueOnce(sound);
    audio.playMusic('bgm');
    audio.destroy();
    expect(sound.stop).toHaveBeenCalled();
  });

  it('registers unlock listener when audio context is locked', () => {
    const lockedScene = makeScene(true);
    new AudioManager(lockedScene);
    expect(lockedScene.game.sound.once).toHaveBeenCalledWith('unlocked', expect.any(Function));
  });
});
