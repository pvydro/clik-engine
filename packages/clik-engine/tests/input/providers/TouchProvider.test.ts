import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../../helpers/TestScene';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { TouchProvider } from '../../../src/input/providers/TouchProvider';
import { ActionMap } from '../../../src/input/ActionMap';

describe('TouchProvider', () => {
  let scene: ReturnType<typeof makeTestScene>;
  let actionMap: ActionMap;
  let provider: TouchProvider;

  beforeEach(() => {
    scene = makeTestScene();
    actionMap = new ActionMap({
      actions: {
        swipeRight: { touch: 'swipe_right' },
        swipeLeft: { touch: 'swipe_left' },
        tap: { touch: 'tap' },
      },
    });
    provider = new TouchProvider(scene as any, actionMap);
  });

  it('registers pointerdown and pointerup handlers on scene.input', () => {
    // Two on() calls: one for pointerdown, one for pointerup
    expect(scene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(scene.input.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('consumeAction detects swipe_right gesture', () => {
    // Extract the registered handlers
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    // Simulate a swipe right: start at (100, 200), end at (250, 210), fast
    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 250, y: 210, time: 1100 });

    expect(provider.consumeAction('swipeRight')).toBe(true);
    // Second call should be consumed already
    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('consumeAction detects swipe_left gesture', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    // Simulate a swipe left
    pointerDownHandler({ x: 300, y: 200, time: 1000 });
    pointerUpHandler({ x: 100, y: 200, time: 1100 });

    expect(provider.consumeAction('swipeLeft')).toBe(true);
  });

  it('consumeAction returns false when no gesture detected', () => {
    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('does not detect swipe if time exceeds swipeMaxTime', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    // Swipe too slow (>300ms default)
    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 300, y: 200, time: 1500 });

    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('setSwipeThreshold changes detection thresholds', () => {
    provider.setSwipeThreshold(200, 500);

    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    // Distance of 100 is below new threshold of 200 — should NOT detect
    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 200, y: 200, time: 1100 });

    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('isActionDown always returns false for touch', () => {
    expect(provider.isActionDown('swipeRight')).toBe(false);
  });

  it('destroy removes pointerdown and pointerup handlers', () => {
    provider.destroy();
    expect(scene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(scene.input.off).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });
});
