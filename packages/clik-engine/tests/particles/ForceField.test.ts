import { describe, it, expect } from 'vitest';
import { ForceField } from '../../src/particles/ForceField';

describe('ForceField', () => {
  it('attractor pulls target toward center', () => {
    const field = new ForceField({ type: 'attractor', x: 100, y: 100, strength: 1000 });
    const target = { x: 200, y: 100, vx: 0, vy: 0 };
    field.apply(target, 1000);
    expect(target.vx).toBeLessThan(0); // pulled left toward center
  });

  it('repeller pushes target away', () => {
    const field = new ForceField({ type: 'repeller', x: 100, y: 100, strength: 1000 });
    const target = { x: 200, y: 100, vx: 0, vy: 0 };
    field.apply(target, 1000);
    expect(target.vx).toBeGreaterThan(0); // pushed right
  });

  it('vortex applies perpendicular force', () => {
    const field = new ForceField({ type: 'vortex', x: 100, y: 100, strength: 1000 });
    const target = { x: 200, y: 100, vx: 0, vy: 0 };
    field.apply(target, 1000);
    // Force should be perpendicular (mostly vertical, not horizontal)
    expect(Math.abs(target.vy)).toBeGreaterThan(0);
  });

  it('wind applies force in angle direction', () => {
    const field = new ForceField({ type: 'wind', x: 0, y: 0, strength: 100, angle: 0 });
    const target = { x: 50, y: 50, vx: 0, vy: 0 };
    field.apply(target, 1000);
    expect(target.vx).toBeGreaterThan(0); // wind blows right
    expect(Math.abs(target.vy)).toBeLessThan(1); // minimal vertical
  });

  it('turbulence adds pseudo-random force', () => {
    const field = new ForceField({ type: 'turbulence', x: 0, y: 0, strength: 100, scale: 0.1 });
    const t1 = { x: 0, y: 0, vx: 0, vy: 0 };
    const t2 = { x: 100, y: 100, vx: 0, vy: 0 };
    field.apply(t1, 1000);
    field.apply(t2, 1000);
    // Different positions get different forces
    expect(t1.vx).not.toEqual(t2.vx);
  });

  it('respects radius — no effect outside', () => {
    const field = new ForceField({ type: 'attractor', x: 0, y: 0, strength: 1000, radius: 50 });
    const target = { x: 200, y: 0, vx: 0, vy: 0 };
    field.apply(target, 1000);
    expect(target.vx).toBe(0); // outside radius
  });

  it('respects radius — affects inside', () => {
    const field = new ForceField({ type: 'attractor', x: 0, y: 0, strength: 1000, radius: 200 });
    const target = { x: 50, y: 0, vx: 0, vy: 0 };
    field.apply(target, 1000);
    expect(target.vx).not.toBe(0);
  });

  it('enabled=false skips application', () => {
    const field = new ForceField({ type: 'attractor', x: 0, y: 0, strength: 1000 });
    field.enabled = false;
    const target = { x: 100, y: 0, vx: 0, vy: 0 };
    field.apply(target, 1000);
    expect(target.vx).toBe(0);
  });

  it('applyAll affects all targets', () => {
    const field = new ForceField({ type: 'wind', x: 0, y: 0, strength: 100, angle: 0 });
    const targets = [
      { x: 0, y: 0, vx: 0, vy: 0 },
      { x: 50, y: 50, vx: 0, vy: 0 },
    ];
    field.applyAll(targets, 1000);
    expect(targets[0].vx).toBeGreaterThan(0);
    expect(targets[1].vx).toBeGreaterThan(0);
  });

  it('setPosition moves the field', () => {
    const field = new ForceField({ type: 'attractor', x: 0, y: 0, strength: 100 });
    field.setPosition(500, 500);
    expect(field.getPosition()).toEqual({ x: 500, y: 500 });
  });

  it('getType returns the type', () => {
    const field = new ForceField({ type: 'vortex', x: 0, y: 0 });
    expect(field.getType()).toBe('vortex');
  });
});
