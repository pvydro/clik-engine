import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { input: vi.fn() },
}));

import { ComboDetector } from '../../src/input/ComboDetector';

describe('ComboDetector', () => {
  it('detects a combo sequence', () => {
    const detector = new ComboDetector();
    detector.addCombo({ name: 'hadouken', sequence: ['down', 'right', 'punch'], timeout: 500 });

    expect(detector.input('down', 0)).toBeNull();
    expect(detector.input('right', 100)).toBeNull();
    expect(detector.input('punch', 200)).toBe('hadouken');
  });

  it('fails if timeout exceeded', () => {
    const detector = new ComboDetector();
    detector.addCombo({ name: 'combo', sequence: ['a', 'b'], timeout: 200 });

    detector.input('a', 0);
    expect(detector.input('b', 500)).toBeNull(); // too slow
  });

  it('fires callbacks', () => {
    const callback = vi.fn();
    const detector = new ComboDetector();
    detector.addCombo({ name: 'special', sequence: ['up', 'up', 'down'] });
    detector.onCombo('special', callback);

    detector.input('up', 0);
    detector.input('up', 50);
    detector.input('down', 100);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('clears buffer after successful combo', () => {
    const detector = new ComboDetector();
    detector.addCombo({ name: 'ab', sequence: ['a', 'b'] });

    detector.input('a', 0);
    detector.input('b', 50); // triggers 'ab', clears buffer
    expect(detector.input('b', 100)).toBeNull(); // 'b' alone doesn't match
  });

  it('handles multiple combos', () => {
    const detector = new ComboDetector();
    detector.addCombo({ name: 'punch', sequence: ['right', 'a'] });
    detector.addCombo({ name: 'kick', sequence: ['right', 'b'] });

    detector.input('right', 0);
    expect(detector.input('b', 50)).toBe('kick');
  });

  it('removes combos', () => {
    const detector = new ComboDetector();
    detector.addCombo({ name: 'test', sequence: ['a', 'b'] });
    detector.removeCombo('test');

    detector.input('a', 0);
    expect(detector.input('b', 50)).toBeNull();
  });

  it('prunes old buffer entries', () => {
    const detector = new ComboDetector(500); // 500ms buffer
    detector.addCombo({ name: 'ab', sequence: ['a', 'b'], timeout: 1000 });

    detector.input('a', 0);
    // 'a' should be pruned after 500ms
    expect(detector.input('b', 600)).toBeNull();
  });
});
