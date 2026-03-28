import { describe, it, expect } from 'vitest';
// ScreenTransition requires Phaser scene, so we test the module exists and exports correctly
import { ScreenTransition } from '../../src/scenes/ScreenTransition';

describe('ScreenTransition', () => {
  it('exports fadeThrough', () => {
    expect(typeof ScreenTransition.fadeThrough).toBe('function');
  });

  it('exports irisWipe', () => {
    expect(typeof ScreenTransition.irisWipe).toBe('function');
  });

  it('exports pixelate', () => {
    expect(typeof ScreenTransition.pixelate).toBe('function');
  });
});
