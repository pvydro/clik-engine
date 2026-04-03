import { describe, it, expect, vi } from 'vitest';
import { AudioMixer } from '../../src/audio/AudioMixer';

function makeScene(musicVolume = 1) {
  return {
    sound: { volume: musicVolume },
  } as any;
}

describe('AudioMixer', () => {
  it('starts not ducking', () => {
    const scene = makeScene();
    const mixer = new AudioMixer(scene);
    expect(mixer.isDucking).toBe(false);
  });

  it('duck reduces volume', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('combat', { targetVolume: 0.3, attackMs: 50, releaseMs: 500 });
    mixer.duck('combat');

    expect(mixer.isDucking).toBe(true);
    expect(scene.sound.volume).toBeCloseTo(0.3, 1);
  });

  it('release restores volume', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('combat', { targetVolume: 0.3, attackMs: 50, releaseMs: 500 });
    mixer.duck('combat');
    mixer.release('combat');

    expect(mixer.isDucking).toBe(false);
    expect(scene.sound.volume).toBeCloseTo(1, 1);
  });

  it('multiple ducks use lowest volume', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('combat', { targetVolume: 0.5, attackMs: 50, releaseMs: 500 });
    mixer.setDuckProfile('dialogue', { targetVolume: 0.2, attackMs: 50, releaseMs: 500 });

    mixer.duck('combat');
    mixer.duck('dialogue');
    expect(scene.sound.volume).toBeCloseTo(0.2, 1);
  });

  it('releasing one duck recalculates from remaining', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('combat', { targetVolume: 0.5, attackMs: 50, releaseMs: 500 });
    mixer.setDuckProfile('dialogue', { targetVolume: 0.2, attackMs: 50, releaseMs: 500 });

    mixer.duck('combat');
    mixer.duck('dialogue');
    mixer.release('dialogue');
    expect(scene.sound.volume).toBeCloseTo(0.5, 1);
  });

  it('releaseAll restores full volume', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('a', { targetVolume: 0.3, attackMs: 50, releaseMs: 500 });
    mixer.duck('a');
    mixer.releaseAll();
    expect(scene.sound.volume).toBe(1);
  });

  it('getDuckVolume returns current multiplier', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('test', { targetVolume: 0.4, attackMs: 50, releaseMs: 500 });
    mixer.duck('test');
    expect(mixer.getDuckVolume()).toBe(0.4);
  });

  it('getProfileNames returns registered profiles', () => {
    const scene = makeScene();
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('a', { targetVolume: 0.5, attackMs: 50, releaseMs: 500 });
    mixer.setDuckProfile('b', { targetVolume: 0.3, attackMs: 50, releaseMs: 500 });
    expect(mixer.getProfileNames()).toContain('a');
    expect(mixer.getProfileNames()).toContain('b');
  });

  it('getActiveDucks returns active duck names', () => {
    const scene = makeScene();
    const mixer = new AudioMixer(scene);
    mixer.setDuckProfile('combat', { targetVolume: 0.5, attackMs: 50, releaseMs: 500 });
    mixer.duck('combat');
    expect(mixer.getActiveDucks()).toContain('combat');
  });

  it('ignores unknown profile', () => {
    const scene = makeScene(1);
    const mixer = new AudioMixer(scene);
    mixer.duck('nonexistent');
    expect(mixer.isDucking).toBe(false);
  });
});
