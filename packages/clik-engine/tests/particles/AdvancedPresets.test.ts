import { describe, it, expect } from 'vitest';
import { AdvancedParticlePresets } from '../../src/particles/AdvancedPresets';

describe('AdvancedParticlePresets', () => {
  const presets = ['fire', 'smoke', 'snow', 'confetti', 'dust', 'magic', 'lightning', 'blood'] as const;

  for (const name of presets) {
    it(`${name} returns valid ParticlePresetConfig`, () => {
      const config = AdvancedParticlePresets[name]('particle');
      expect(config.key).toBe('particle');
      expect(config.lifespan).toBeGreaterThan(0);
      expect(config.quantity).toBeGreaterThan(0);
      expect(config.speed).toBeDefined();
      expect(config.scale).toBeDefined();
      expect(config.alpha).toBeDefined();
    });
  }

  it('fire has upward angle and warm tint', () => {
    const config = AdvancedParticlePresets.fire('p');
    expect(config.gravityY).toBeLessThan(0);
    expect(Array.isArray(config.tint)).toBe(true);
  });

  it('snow has downward gravity', () => {
    const config = AdvancedParticlePresets.snow('p');
    expect(config.gravityY).toBeGreaterThan(0);
  });

  it('confetti has multiple tint colors', () => {
    const config = AdvancedParticlePresets.confetti('p');
    expect(Array.isArray(config.tint)).toBe(true);
    expect((config.tint as number[]).length).toBeGreaterThanOrEqual(3);
  });
});
