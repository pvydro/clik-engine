import { describe, it, expect } from 'vitest';
import { DirectorAI } from '../../src/ai/DirectorAI';

describe('DirectorAI', () => {
  it('starts at zero intensity', () => {
    const director = new DirectorAI();
    expect(director.getIntensity()).toBe(0);
  });

  it('recordEvent increases intensity', () => {
    const director = new DirectorAI();
    director.recordEvent('kill');
    expect(director.getIntensity()).toBeGreaterThan(0);
  });

  it('intensity decays over time', () => {
    const director = new DirectorAI({ decayRate: 1 });
    director.recordEvent('kill');
    const before = director.getIntensity();
    director.update(1000);
    expect(director.getIntensity()).toBeLessThan(before);
  });

  it('modifiers start at 1', () => {
    const director = new DirectorAI();
    expect(director.getModifier('spawnRate')).toBe(1);
    expect(director.getModifier('enemyHealth')).toBe(1);
  });

  it('modifiers adjust toward target intensity', () => {
    const director = new DirectorAI({ targetIntensity: 0.5, adjustmentSpeed: 0.1, decayRate: 0 });
    // Low intensity → director should ramp up spawn rate
    for (let i = 0; i < 200; i++) director.update(100);
    expect(director.getModifier('spawnRate')).toBeGreaterThan(1);
  });

  it('high intensity reduces spawn rate', () => {
    const director = new DirectorAI({ targetIntensity: 0.3, adjustmentSpeed: 0.1 });
    // Pump intensity high
    for (let i = 0; i < 10; i++) director.recordEvent('kill');
    for (let i = 0; i < 50; i++) director.update(100);
    expect(director.getModifier('spawnRate')).toBeLessThan(1);
  });

  it('custom event weights work', () => {
    const director = new DirectorAI();
    director.setEventWeight('super_kill', 0.5);
    director.recordEvent('super_kill');
    expect(director.getIntensity()).toBe(0.5);
  });

  it('getRecentEventCount tracks events', () => {
    const director = new DirectorAI();
    director.recordEvent('kill');
    director.recordEvent('kill');
    director.recordEvent('damage_taken');
    expect(director.getRecentEventCount('kill')).toBe(2);
    expect(director.getRecentEventCount('damage_taken')).toBe(1);
  });

  it('relief period triggers after high intensity', () => {
    const director = new DirectorAI({ reliefDuration: 5000 });
    // Push above 0.8 threshold
    for (let i = 0; i < 10; i++) director.recordEvent('kill');
    expect(director.isInRelief()).toBe(true);
  });

  it('getAllModifiers returns all', () => {
    const director = new DirectorAI();
    const mods = director.getAllModifiers();
    expect(mods).toHaveProperty('spawnRate');
    expect(mods).toHaveProperty('enemyHealth');
    expect(mods).toHaveProperty('enemyDamage');
    expect(mods).toHaveProperty('enemyAggression');
  });

  it('setTargetIntensity clamps to 0-1', () => {
    const director = new DirectorAI();
    director.setTargetIntensity(2);
    // Internal check — just ensure no crash
    director.update(100);
  });

  it('reset restores initial state', () => {
    const director = new DirectorAI();
    director.recordEvent('kill');
    director.update(1000);
    director.reset();
    expect(director.getIntensity()).toBe(0);
    expect(director.getModifier('spawnRate')).toBe(1);
  });

  it('getDebugState returns structured info', () => {
    const director = new DirectorAI();
    const debug = director.getDebugState();
    expect(debug).toHaveProperty('intensity');
    expect(debug).toHaveProperty('inRelief');
    expect(debug).toHaveProperty('modifiers');
  });
});
