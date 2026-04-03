import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { CullOffscreen } from '../../../src/entity/components/CullOffscreen';
import { makeEntityMock } from '../../helpers/TestScene';

describe('CullOffscreen', () => {
  it('does not cull entity within camera bounds', () => {
    const entity = makeEntityMock(400, 300);
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.active).toBe(true);
  });

  it('destroys entity when outside camera bounds', () => {
    const entity = makeEntityMock(900, 300); // beyond 800 + 50 margin
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.destroy).toHaveBeenCalled();
  });

  it('culls entity above camera', () => {
    const entity = makeEntityMock(400, -100); // above 0 - 50 margin
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.destroy).toHaveBeenCalled();
  });

  it('culls entity left of camera', () => {
    const entity = makeEntityMock(-100, 300);
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.destroy).toHaveBeenCalled();
  });

  it('culls entity below camera', () => {
    const entity = makeEntityMock(400, 700); // below 600 + 50 margin
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.destroy).toHaveBeenCalled();
  });

  it('uses pool.release instead of destroy when pool is set', () => {
    const entity = makeEntityMock(900, 300);
    const mockPool = { release: vi.fn() };
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;
    cull.usePool(mockPool as any);

    cull.update(16);
    expect(mockPool.release).toHaveBeenCalledWith(entity);
    expect(entity.destroy).not.toHaveBeenCalled();
  });

  it('respects margin parameter', () => {
    const entity = makeEntityMock(830, 300); // 30px past 800, but within 50 margin
    const cull = new CullOffscreen(50);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.active).toBe(true);
  });

  it('culls with zero margin', () => {
    const entity = makeEntityMock(801, 300);
    const cull = new CullOffscreen(0);
    cull.entity = entity as any;

    cull.update(16);
    expect(entity.destroy).toHaveBeenCalled();
  });
});
