import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {},
}));

function makeScene() {
  return {
    time: {
      timeScale: 1,
      delayedCall: vi.fn((_d: number, cb: Function) => { cb(); }),
      addEvent: vi.fn(() => ({ destroy: vi.fn() })),
    },
    physics: { world: { pause: vi.fn(), resume: vi.fn() } },
    cameras: {
      main: {
        shake: vi.fn(),
        flash: vi.fn(),
        postFX: {
          addBarrel: vi.fn(() => ({ amount: 0 })),
          addColorMatrix: vi.fn(() => ({ brightness: vi.fn(), hue: vi.fn(), saturate: vi.fn() })),
          addPixelate: vi.fn(() => ({})),
          addBlur: vi.fn(() => ({ strength: 0 })),
          remove: vi.fn(),
        },
      },
    },
    tweens: {
      add: vi.fn((config: any) => { config.onComplete?.(); return {}; }),
    },
  } as any;
}

import { EffectComposer } from '../../src/effects/EffectComposer';

describe('EffectComposer', () => {
  it('registers default presets', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    const names = composer.getPresetNames();
    expect(names).toContain('criticalHit');
    expect(names).toContain('heavyImpact');
    expect(names).toContain('death');
    expect(names).toContain('dashBurst');
    expect(names).toContain('corruption');
  });

  it('plays a preset without crashing', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    expect(() => composer.play('criticalHit', 100, 100)).not.toThrow();
  });

  it('registers custom presets', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    composer.register({
      name: 'custom',
      steps: [{ type: 'shake', duration: 100 }],
    });
    expect(composer.getPresetNames()).toContain('custom');
  });

  it('plays custom preset', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    composer.register({
      name: 'myEffect',
      steps: [
        { type: 'shake', duration: 200, intensity: 0.01 },
        { type: 'flash', duration: 100 },
      ],
    });
    composer.play('myEffect');
    expect(scene.cameras.main.shake).toHaveBeenCalled();
    expect(scene.cameras.main.flash).toHaveBeenCalled();
  });

  it('plays inline effect object', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    composer.play({
      name: 'inline',
      steps: [{ type: 'shake', duration: 50 }],
    });
    expect(scene.cameras.main.shake).toHaveBeenCalled();
  });

  it('ignores unknown preset name', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    expect(() => composer.play('nonexistent')).not.toThrow();
  });

  it('getPreset returns registered preset', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    expect(composer.getPreset('criticalHit')).toBeDefined();
    expect(composer.getPreset('criticalHit')!.steps.length).toBeGreaterThan(0);
  });

  it('exposes individual effect systems', () => {
    const scene = makeScene();
    const composer = new EffectComposer(scene);
    expect(composer.getDistortion()).toBeDefined();
    expect(composer.getChromatic()).toBeDefined();
    expect(composer.getGlitch()).toBeDefined();
    expect(composer.getTimeEffects()).toBeDefined();
  });
});
