import { describe, it, expect } from 'vitest';
import { DeltaCompression } from '../../src/network/DeltaCompression';

describe('DeltaCompression', () => {
  it('encode detects changed fields', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100, y: 200, hp: 50 });
    const packet = dc.encode({ x: 105, y: 200, hp: 50 });
    expect(packet.changed).toEqual({ x: 105 });
  });

  it('encode detects multiple changes', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 0, y: 0 });
    const packet = dc.encode({ x: 10, y: 20 });
    expect(packet.changed).toEqual({ x: 10, y: 20 });
  });

  it('encode returns empty changed for identical state', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100 });
    const packet = dc.encode({ x: 100 });
    expect(DeltaCompression.isEmpty(packet)).toBe(true);
  });

  it('encode detects removed keys', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100, temp: 'value' });
    const packet = dc.encode({ x: 100 });
    expect(packet.changed.temp).toBeUndefined();
    expect('temp' in packet.changed).toBe(true);
  });

  it('decode applies delta to baseline', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100, y: 200, hp: 50 });
    const full = dc.decode({ changed: { x: 105 }, seq: 1 });
    expect(full).toEqual({ x: 105, y: 200, hp: 50 });
  });

  it('decode handles removed keys', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100, temp: 'value' });
    const full = dc.decode({ changed: { temp: undefined }, seq: 1 });
    expect(full).not.toHaveProperty('temp');
  });

  it('applyToBaseline updates the baseline', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100 });
    dc.applyToBaseline({ changed: { x: 200 }, seq: 1 });
    expect(dc.getBaseline().x).toBe(200);
  });

  it('seq increments on each encode', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 0 });
    dc.encode({ x: 1 });
    dc.encode({ x: 2 });
    expect(dc.getSeq()).toBe(2);
  });

  it('round-trip: encode then decode returns full state', () => {
    const dc = new DeltaCompression();
    const original = { x: 100, y: 200, hp: 50, name: 'player' };
    dc.setBaseline(original);

    const updated = { x: 105, y: 200, hp: 45, name: 'player' };
    const packet = dc.encode(updated);
    const decoded = dc.decode(packet);
    expect(decoded).toEqual(updated);
  });

  it('quantize reduces precision', () => {
    expect(DeltaCompression.quantize(3.14159, 100)).toBe(3.14);
    expect(DeltaCompression.quantize(3.14159, 10)).toBe(3.1);
    expect(DeltaCompression.quantize(3.14159, 1)).toBe(3);
  });

  it('clear resets baseline and seq', () => {
    const dc = new DeltaCompression();
    dc.setBaseline({ x: 100 });
    dc.encode({ x: 200 });
    dc.clear();
    expect(dc.getBaseline()).toEqual({});
    expect(dc.getSeq()).toBe(0);
  });
});
