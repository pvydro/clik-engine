import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { Hitbox } from '../../../src/entity/components/Hitbox';
import { makeEntityMock } from '../../helpers/TestScene';

describe('Hitbox', () => {
  it('returns world-space boxes offset by entity position', () => {
    const entity = makeEntityMock(100, 200);
    const hitbox = new Hitbox([
      { offsetX: -8, offsetY: -8, width: 16, height: 16 },
    ]);
    hitbox.entity = entity as any;

    const boxes = hitbox.getWorldBoxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0].x).toBe(92);
    expect(boxes[0].y).toBe(192);
    expect(boxes[0].width).toBe(16);
    expect(boxes[0].height).toBe(16);
  });

  it('supports multiple hitboxes', () => {
    const entity = makeEntityMock(0, 0);
    const hitbox = new Hitbox([
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'body' },
      { offsetX: 20, offsetY: 0, width: 5, height: 5, tag: 'sword' },
    ]);
    hitbox.entity = entity as any;

    expect(hitbox.getWorldBoxes()).toHaveLength(2);
  });

  it('disables boxes by tag', () => {
    const entity = makeEntityMock(0, 0);
    const hitbox = new Hitbox([
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'body' },
      { offsetX: 20, offsetY: 0, width: 5, height: 5, tag: 'sword' },
    ]);
    hitbox.entity = entity as any;

    hitbox.disableByTag('sword');
    const boxes = hitbox.getWorldBoxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0].tag).toBe('body');
  });

  it('re-enables boxes by tag', () => {
    const entity = makeEntityMock(0, 0);
    const hitbox = new Hitbox([
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'sword' },
    ]);
    hitbox.entity = entity as any;

    hitbox.disableByTag('sword');
    expect(hitbox.getWorldBoxes()).toHaveLength(0);

    hitbox.enableByTag('sword');
    expect(hitbox.getWorldBoxes()).toHaveLength(1);
  });

  it('reset re-enables all boxes', () => {
    const entity = makeEntityMock(0, 0);
    const hitbox = new Hitbox([
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'a' },
      { offsetX: 0, offsetY: 0, width: 10, height: 10, tag: 'b' },
    ]);
    hitbox.entity = entity as any;

    hitbox.disableByTag('a');
    hitbox.disableByTag('b');
    hitbox.reset();
    expect(hitbox.getWorldBoxes()).toHaveLength(2);
  });

  it('getBoxes returns raw definitions', () => {
    const defs = [{ offsetX: 0, offsetY: 0, width: 10, height: 10 }];
    const hitbox = new Hitbox(defs);
    expect(hitbox.getBoxes()).toBe(defs);
  });
});
