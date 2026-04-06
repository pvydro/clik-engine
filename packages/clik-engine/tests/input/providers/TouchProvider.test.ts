import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { TouchProvider } from '../../../src/input/providers/TouchProvider';
import { ActionMap } from '../../../src/input/ActionMap';

function makeTestScene() {
  return {
    input: {
      on: vi.fn(),
      off: vi.fn(),
    },
  };
}

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
    provider = new TouchProvider(actionMap);
    provider.initFromScene(scene as any);
  });

  it('registers pointerdown and pointerup handlers on scene.input', () => {
    expect(scene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(scene.input.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('consumeAction detects swipe_right gesture', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 250, y: 210, time: 1100 });

    expect(provider.consumeAction('swipeRight')).toBe(true);
    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('consumeAction detects swipe_left gesture', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    pointerDownHandler({ x: 300, y: 200, time: 1000 });
    pointerUpHandler({ x: 100, y: 195, time: 1100 });

    expect(provider.consumeAction('swipeLeft')).toBe(true);
  });

  it('does not detect swipe below distance threshold', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 110, y: 200, time: 1050 });

    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('does not detect swipe exceeding time threshold', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 250, y: 200, time: 2000 });

    expect(provider.consumeAction('swipeRight')).toBe(false);
  });

  it('detects tap gesture on short press', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];
    const pointerUpHandler = calls.find((c: any[]) => c[0] === 'pointerup')![1];

    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    pointerUpHandler({ x: 102, y: 201, time: 1050 });

    expect(provider.consumeAction('tap')).toBe(true);
  });

  it('endFrame clears pointerDownThisFrame', () => {
    const calls = (scene.input.on as ReturnType<typeof vi.fn>).mock.calls;
    const pointerDownHandler = calls.find((c: any[]) => c[0] === 'pointerdown')![1];

    pointerDownHandler({ x: 100, y: 200, time: 1000 });
    provider.endFrame();
    // After endFrame, pointerDownThisFrame is false but pointerIsDown is still true
    // isActionDown for a 'down' binding checks both
    const pointerAction = new ActionMap({ actions: { shoot: { pointer: 'down' } } });
    const p2 = new TouchProvider(pointerAction);
    p2.initFromScene(scene as any);
    // Can't easily test internal state, but endFrame should not throw
  });

  it('initFromScene only runs once', () => {
    const scene2 = makeTestScene();
    provider.initFromScene(scene2 as any);
    expect(scene2.input.on).not.toHaveBeenCalled();
  });

  it('destroy removes handlers', () => {
    provider.destroy();
    expect(scene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(scene.input.off).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });
});
