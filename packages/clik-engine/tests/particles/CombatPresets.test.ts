import { describe, it, expect } from 'vitest';
import { CombatParticlePresets } from '../../src/particles/CombatPresets';

describe('CombatParticlePresets', () => {
  const presetNames = Object.keys(CombatParticlePresets) as (keyof typeof CombatParticlePresets)[];

  it('has expected presets', () => {
    expect(presetNames).toContain('slashSparks');
    expect(presetNames).toContain('bulletSparks');
    expect(presetNames).toContain('dashTrail');
    expect(presetNames).toContain('shieldBreak');
    expect(presetNames).toContain('healGlow');
    expect(presetNames).toContain('explosionCore');
    expect(presetNames).toContain('explosionDebris');
    expect(presetNames).toContain('bloodSplatter');
  });

  for (const name of presetNames) {
    it(`${name} has valid config`, () => {
      const preset = CombatParticlePresets[name];
      expect(preset.maxParticles).toBeGreaterThan(0);
      expect(preset.lifetime).toBeGreaterThan(0);
      expect(preset.speedMax).toBeGreaterThanOrEqual(preset.speedMin);
      expect(preset.sizeMax).toBeGreaterThanOrEqual(preset.sizeMin);
      expect(preset.color).toBeGreaterThanOrEqual(0);
    });
  }

  it('healGlow has negative gravity (floats up)', () => {
    expect(CombatParticlePresets.healGlow.gravity).toBeLessThan(0);
  });

  it('explosionDebris has positive gravity (falls down)', () => {
    expect(CombatParticlePresets.explosionDebris.gravity).toBeGreaterThan(0);
  });

  it('dashTrail has continuous rate', () => {
    expect(CombatParticlePresets.dashTrail.rate).toBeGreaterThan(0);
  });

  it('slashSparks has zero rate (burst only)', () => {
    expect(CombatParticlePresets.slashSparks.rate).toBe(0);
  });
});
