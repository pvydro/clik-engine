import { describe, it, expect, vi } from 'vitest';
import { GameTimer } from '../../src/utils/GameTimer';

describe('GameTimer', () => {
  it('counts down over time', () => {
    const timer = new GameTimer(1000).start();
    timer.update(500);
    expect(timer.timeRemaining).toBe(500);
    expect(timer.progress).toBeCloseTo(0.5);
    expect(timer.ratio).toBeCloseTo(0.5);
  });

  it('fires onComplete when done', () => {
    const cb = vi.fn();
    const timer = new GameTimer(100).onComplete(cb).start();
    timer.update(50);
    expect(cb).not.toHaveBeenCalled();
    timer.update(60);
    expect(cb).toHaveBeenCalledOnce();
    expect(timer.isComplete).toBe(true);
  });

  it('fires onTick each update', () => {
    const tick = vi.fn();
    const timer = new GameTimer(1000).onTick(tick).start();
    timer.update(100);
    timer.update(100);
    expect(tick).toHaveBeenCalledTimes(2);
  });

  it('can be paused and resumed', () => {
    const timer = new GameTimer(1000).start();
    timer.update(300);
    timer.pause();
    timer.update(500); // Should not count
    expect(timer.timeRemaining).toBe(700);
    timer.resume();
    timer.update(200);
    expect(timer.timeRemaining).toBe(500);
  });

  it('can be stopped', () => {
    const cb = vi.fn();
    const timer = new GameTimer(100).onComplete(cb).start();
    timer.stop();
    timer.update(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('can be reset', () => {
    const timer = new GameTimer(1000).start();
    timer.update(600);
    timer.reset();
    expect(timer.timeRemaining).toBe(1000);
  });

  it('can extend time', () => {
    const timer = new GameTimer(1000).start();
    timer.update(800);
    timer.extend(500);
    expect(timer.timeRemaining).toBe(700);
  });

  it('creates repeating timers', () => {
    const cb = vi.fn();
    const timer = GameTimer.repeating(100, cb);
    timer.start();
    timer.update(110);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(timer.isRunning).toBe(true); // Auto-restarted
    timer.update(110);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('creates countdown timers', () => {
    const tick = vi.fn();
    const complete = vi.fn();
    const timer = GameTimer.countdown(3, tick, complete);
    timer.start();
    timer.update(1100); // 2 seconds left
    expect(tick).toHaveBeenCalledWith(2);
    timer.update(1000); // 1 second left
    expect(tick).toHaveBeenCalledWith(1);
    timer.update(1000); // Done
    expect(complete).toHaveBeenCalled();
  });
});
