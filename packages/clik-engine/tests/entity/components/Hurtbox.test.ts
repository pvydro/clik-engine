import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { Hurtbox } from '../../../src/entity/components/Hurtbox';
import { makeEntityMock } from '../../helpers/TestScene';

describe('Hurtbox', () => {
  it('returns world-space boxes', () => {
    const entity = makeEntityMock(50, 100);
    const hurtbox = new Hurtbox([
      { offsetX: -4, offsetY: -4, width: 8, height: 8 },
    ]);
    hurtbox.entity = entity as any;

    const boxes = hurtbox.getWorldBoxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0].x).toBe(46);
    expect(boxes[0].y).toBe(96);
  });

  it('starts not invincible', () => {
    const hurtbox = new Hurtbox([]);
    expect(hurtbox.isInvincible).toBe(false);
  });

  it('triggerIframes makes entity invincible', () => {
    const entity = makeEntityMock();
    const hurtbox = new Hurtbox([]);
    hurtbox.entity = entity as any;
    hurtbox.triggerIframes(500);
    expect(hurtbox.isInvincible).toBe(true);
    expect(hurtbox.iframeTime).toBe(500);
  });

  it('iframes tick down with update', () => {
    const entity = makeEntityMock();
    const hurtbox = new Hurtbox([]);
    hurtbox.entity = entity as any;
    hurtbox.triggerIframes(500);

    hurtbox.update(200);
    expect(hurtbox.isInvincible).toBe(true);
    expect(hurtbox.iframeTime).toBe(300);

    hurtbox.update(400);
    expect(hurtbox.isInvincible).toBe(false);
    expect(hurtbox.iframeTime).toBe(0);
  });

  it('disables boxes by tag', () => {
    const entity = makeEntityMock(0, 0);
    const hurtbox = new Hurtbox([
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'head' },
      { offsetX: 0, offsetY: 10, width: 10, height: 10, tag: 'body' },
    ]);
    hurtbox.entity = entity as any;

    hurtbox.disableByTag('head');
    expect(hurtbox.getWorldBoxes()).toHaveLength(1);
    expect(hurtbox.getWorldBoxes()[0].tag).toBe('body');
  });

  it('reset clears iframes and re-enables all boxes', () => {
    const entity = makeEntityMock(0, 0);
    const hurtbox = new Hurtbox([
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'head' },
    ]);
    hurtbox.entity = entity as any;

    hurtbox.triggerIframes(1000);
    hurtbox.disableByTag('head');
    hurtbox.reset();

    expect(hurtbox.isInvincible).toBe(false);
    expect(hurtbox.getWorldBoxes()).toHaveLength(1);
  });
});
