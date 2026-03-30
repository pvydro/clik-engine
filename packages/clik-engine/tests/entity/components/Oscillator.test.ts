import { describe, it, expect } from 'vitest';
import { Oscillator } from '../../../src/entity/components/Oscillator';
import { makeEntityMock } from '../../helpers/TestScene';

function makeOscillator(amplitude = 10, frequency = 1, axis: 'x' | 'y' | 'both' = 'y') {
  const o = new Oscillator(amplitude, frequency, axis);
  o.entity = makeEntityMock(100, 200) as never;
  o.onAttach();
  return o;
}

describe('Oscillator', () => {
  it('onAttach records origin from entity position', () => {
    const o = makeOscillator();
    // After a half-cycle the entity should have moved back toward origin
    o.update(500); // 0.5 s at 1 Hz = half cycle, sin(π) ≈ 0
    // y should be close to origin (200) at t=0.5 on 1 Hz sine
    expect(Math.abs(o.entity.y - 200)).toBeLessThan(0.1);
  });

  it('oscillates on y axis by default', () => {
    const o = makeOscillator(20, 1, 'y');
    o.update(250); // quarter cycle → peak
    expect(Math.abs(o.entity.y - 200)).toBeGreaterThan(0);
    expect(o.entity.x).toBe(100); // x unchanged
  });

  it('oscillates on x axis', () => {
    const o = makeOscillator(20, 1, 'x');
    o.update(250);
    expect(Math.abs(o.entity.x - 100)).toBeGreaterThan(0);
    expect(o.entity.y).toBe(200); // y unchanged
  });

  it('oscillates on both axes', () => {
    const o = makeOscillator(20, 1, 'both');
    o.update(250);
    expect(Math.abs(o.entity.x - 100)).toBeGreaterThan(0);
    expect(Math.abs(o.entity.y - 200)).toBeGreaterThan(0);
  });

  it('amplitude controls peak offset', () => {
    const o = makeOscillator(50, 1, 'y');
    // At quarter period, sin should be near 1 → y offset ≈ amplitude
    o.update(250); // 0.25 s = quarter of 1 Hz
    const offset = Math.abs(o.entity.y - 200);
    expect(offset).toBeCloseTo(50, 0);
  });

  it('setAmplitude returns this', () => {
    const o = makeOscillator();
    expect(o.setAmplitude(20)).toBe(o);
  });

  it('setFrequency returns this', () => {
    const o = makeOscillator();
    expect(o.setFrequency(2)).toBe(o);
  });

  it('resetOrigin resets to current entity position', () => {
    const o = makeOscillator(10, 1, 'y');
    o.entity.x = 300;
    o.entity.y = 400;
    o.resetOrigin();
    o.update(500); // half cycle, sin ≈ 0 → near new origin
    expect(Math.abs(o.entity.y - 400)).toBeLessThan(0.1);
  });
});
