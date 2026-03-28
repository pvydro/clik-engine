import { describe, it, expect } from 'vitest';
import { Cooldown } from '../../src/utils/Cooldown';

describe('Cooldown', () => {
  it('starts ready', () => {
    const cd = new Cooldown(500);
    expect(cd.isReady).toBe(true);
  });

  it('becomes unready after use', () => {
    const cd = new Cooldown(500);
    expect(cd.use()).toBe(true);
    expect(cd.isReady).toBe(false);
  });

  it('rejects use when on cooldown', () => {
    const cd = new Cooldown(500);
    cd.use();
    expect(cd.use()).toBe(false);
  });

  it('becomes ready after duration', () => {
    const cd = new Cooldown(100);
    cd.use();
    cd.update(50);
    expect(cd.isReady).toBe(false);
    cd.update(60);
    expect(cd.isReady).toBe(true);
  });

  it('tracks progress', () => {
    const cd = new Cooldown(1000);
    cd.use();
    cd.update(500);
    expect(cd.progress).toBeCloseTo(0.5);
  });

  it('can be reset', () => {
    const cd = new Cooldown(1000);
    cd.use();
    cd.reset();
    expect(cd.isReady).toBe(true);
  });

  it('forceUse works even when ready', () => {
    const cd = new Cooldown(100);
    cd.forceUse();
    expect(cd.isReady).toBe(false);
  });

  it('reports time remaining', () => {
    const cd = new Cooldown(1000);
    cd.use();
    cd.update(300);
    expect(cd.timeRemaining).toBe(700);
  });
});
