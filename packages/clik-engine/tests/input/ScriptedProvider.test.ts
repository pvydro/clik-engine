import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: { Keyboard: { KeyCodes: {} } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
  },
}));

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { ScriptedProvider } from '../../src/input/providers/ScriptedProvider';
import { InputManager } from '../../src/input/InputManager';
import type { InputConfig } from '../../src/utils/types';

describe('ScriptedProvider', () => {
  let p: ScriptedProvider;

  beforeEach(() => {
    p = new ScriptedProvider();
  });

  it('starts with no actions held', () => {
    expect(p.isActionDown('jump')).toBe(false);
  });

  it('set(true) holds an action until set(false)', () => {
    p.set('jump', true);
    expect(p.isActionDown('jump')).toBe(true);
    p.update();
    expect(p.isActionDown('jump')).toBe(true);
    p.set('jump', false);
    expect(p.isActionDown('jump')).toBe(false);
  });

  it('pulse holds for the requested number of frames', () => {
    p.pulse('attack', 2);
    expect(p.isActionDown('attack')).toBe(true);
    p.update();
    expect(p.isActionDown('attack')).toBe(true);
    p.update();
    expect(p.isActionDown('attack')).toBe(false);
  });

  it('pulse default lasts one frame', () => {
    p.pulse('dash');
    expect(p.isActionDown('dash')).toBe(true);
    p.update();
    expect(p.isActionDown('dash')).toBe(false);
  });

  it('pulse picks the longer of overlapping pulses', () => {
    p.pulse('attack', 1);
    p.pulse('attack', 4);
    p.update();
    p.update();
    expect(p.isActionDown('attack')).toBe(true);
  });

  it('apply() sets multiple actions in one call', () => {
    p.apply({ left: true, right: false, jump: true });
    expect(p.isActionDown('left')).toBe(true);
    expect(p.isActionDown('right')).toBe(false);
    expect(p.isActionDown('jump')).toBe(true);
  });

  it('clear() releases everything', () => {
    p.set('jump', true);
    p.pulse('attack', 5);
    p.clear();
    expect(p.isActionDown('jump')).toBe(false);
    expect(p.isActionDown('attack')).toBe(false);
  });

  it('integrates with InputManager via addProvider', () => {
    const config: InputConfig = {
      actions: {
        jump: { keys: ['SPACE'] },
        left: { keys: ['LEFT'] },
      },
    };
    const mgr = new InputManager(config);
    // Skip initFromScene — keyboard/touch/gamepad just sit idle without bindings
    mgr.addProvider(p);

    p.set('jump', true);
    mgr.update();
    expect(mgr.isDown('jump')).toBe(true);
    expect(mgr.justPressed('jump')).toBe(true);

    mgr.update();
    expect(mgr.isDown('jump')).toBe(true);
    expect(mgr.justPressed('jump')).toBe(false);

    p.set('jump', false);
    mgr.update();
    expect(mgr.isDown('jump')).toBe(false);
    expect(mgr.justReleased('jump')).toBe(true);
  });

  it('InputManager.removeProvider unhooks the scripted provider', () => {
    const mgr = new InputManager({ actions: { jump: { keys: ['SPACE'] } } });
    mgr.addProvider(p);
    p.set('jump', true);
    mgr.update();
    expect(mgr.isDown('jump')).toBe(true);

    expect(mgr.removeProvider(p)).toBe(true);
    mgr.update();
    expect(mgr.isDown('jump')).toBe(false);
    expect(mgr.removeProvider(p)).toBe(false);
  });
});
