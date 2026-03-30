import { describe, it, expect, beforeEach } from 'vitest';
import { InputBuffer } from '../../src/input/InputBuffer';

describe('InputBuffer', () => {
  let buffer: InputBuffer;

  beforeEach(() => {
    buffer = new InputBuffer(300, 30);
  });

  it('starts empty', () => {
    expect(buffer.size).toBe(0);
    expect(buffer.getSequence()).toEqual([]);
  });

  it('records actions', () => {
    buffer.record('attack', 1000);
    buffer.record('jump', 1100);
    expect(buffer.size).toBe(2);
  });

  it('wasActionInWindow finds recent actions', () => {
    buffer.record('attack', 1000);
    expect(buffer.wasActionInWindow('attack', 300, 1200)).toBe(true);
    expect(buffer.wasActionInWindow('attack', 300, 1400)).toBe(false);
  });

  it('wasActionInWindow returns false for missing actions', () => {
    buffer.record('attack', 1000);
    expect(buffer.wasActionInWindow('jump', 300, 1100)).toBe(false);
  });

  it('getSequence returns actions within window', () => {
    buffer.record('down', 1000);
    buffer.record('right', 1100);
    buffer.record('attack', 1200);

    expect(buffer.getSequence(300, 1250)).toEqual(['down', 'right', 'attack']);
    expect(buffer.getSequence(100, 1250)).toEqual(['attack']);
  });

  it('matchSequence detects exact trailing sequence', () => {
    buffer.record('down', 1000);
    buffer.record('right', 1100);
    buffer.record('punch', 1200);

    expect(buffer.matchSequence(['down', 'right', 'punch'], 300, 1250)).toBe(true);
    expect(buffer.matchSequence(['right', 'punch'], 300, 1250)).toBe(true);
    expect(buffer.matchSequence(['down', 'punch'], 300, 1250)).toBe(false);
  });

  it('matchSequence returns false if too few inputs', () => {
    buffer.record('attack', 1000);
    expect(buffer.matchSequence(['down', 'attack'], 300, 1100)).toBe(false);
  });

  it('respects maxSize', () => {
    const small = new InputBuffer(1000, 3);
    small.record('a', 1000);
    small.record('b', 1100);
    small.record('c', 1200);
    small.record('d', 1300);
    expect(small.size).toBe(3);
    expect(small.getSequence(1000, 1400)).toEqual(['b', 'c', 'd']);
  });

  it('clear empties the buffer', () => {
    buffer.record('attack', 1000);
    buffer.record('jump', 1100);
    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.getSequence()).toEqual([]);
  });
});
