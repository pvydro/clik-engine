import { describe, it, expect, beforeEach } from 'vitest';
import { CancelWindow } from '../../src/animation/CancelWindow';

describe('CancelWindow', () => {
  let cw: CancelWindow;

  beforeEach(() => {
    cw = new CancelWindow();
    cw.define('attack1', { start: 4, end: 10, into: ['attack2', 'dodge'] });
    cw.define('attack1', { start: 2, end: 10, into: ['special'] });
  });

  it('allows cancel within window for valid target', () => {
    expect(cw.canCancel('attack1', 'attack2', 5)).toBe(true);
  });

  it('rejects cancel before window starts', () => {
    expect(cw.canCancel('attack1', 'attack2', 3)).toBe(false);
  });

  it('rejects cancel after window ends', () => {
    expect(cw.canCancel('attack1', 'attack2', 11)).toBe(false);
  });

  it('rejects cancel for invalid target', () => {
    expect(cw.canCancel('attack1', 'jump', 5)).toBe(false);
  });

  it('handles multiple windows with different targets', () => {
    expect(cw.canCancel('attack1', 'special', 3)).toBe(true); // special has start:2
    expect(cw.canCancel('attack1', 'attack2', 3)).toBe(false); // attack2 has start:4
  });

  it('allows at exact start frame', () => {
    expect(cw.canCancel('attack1', 'attack2', 4)).toBe(true);
  });

  it('allows at exact end frame', () => {
    expect(cw.canCancel('attack1', 'attack2', 10)).toBe(true);
  });

  it('getValidTargets returns all valid targets at frame', () => {
    const targets = cw.getValidTargets('attack1', 5);
    expect(targets).toContain('attack2');
    expect(targets).toContain('dodge');
    expect(targets).toContain('special');
  });

  it('getValidTargets at frame 3 only returns special', () => {
    const targets = cw.getValidTargets('attack1', 3);
    expect(targets).toContain('special');
    expect(targets).not.toContain('attack2');
  });

  it('isInCancelWindow checks any window', () => {
    expect(cw.isInCancelWindow('attack1', 3)).toBe(true); // special window
    expect(cw.isInCancelWindow('attack1', 1)).toBe(false);
    expect(cw.isInCancelWindow('attack1', 5)).toBe(true);
  });

  it('returns false for unknown state', () => {
    expect(cw.canCancel('unknown', 'attack2', 5)).toBe(false);
    expect(cw.getValidTargets('unknown', 5)).toEqual([]);
    expect(cw.isInCancelWindow('unknown', 5)).toBe(false);
  });

  it('getWindows returns definitions', () => {
    expect(cw.getWindows('attack1')).toHaveLength(2);
    expect(cw.getWindows('unknown')).toEqual([]);
  });

  it('clear removes all windows', () => {
    cw.clear();
    expect(cw.canCancel('attack1', 'attack2', 5)).toBe(false);
  });
});
