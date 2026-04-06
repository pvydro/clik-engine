import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { GamepadProvider } from '../../../src/input/providers/GamepadProvider';
import { ActionMap } from '../../../src/input/ActionMap';

function makeGamepadStub() {
  return {
    index: 0,
    id: 'Test Pad',
    buttons: [
      { pressed: false },
      { pressed: false },
      { pressed: false },
    ],
    leftStick: { x: 0, y: 0 },
  };
}

function makeTestScene(gamepadStub?: ReturnType<typeof makeGamepadStub>) {
  return {
    input: {
      gamepad: {
        on: vi.fn(),
        off: vi.fn(),
        total: gamepadStub ? 1 : 0,
        pad1: gamepadStub ?? null,
        getPad: vi.fn(() => gamepadStub ?? null),
      },
    },
  };
}

describe('GamepadProvider', () => {
  let actionMap: ActionMap;

  beforeEach(() => {
    actionMap = new ActionMap({
      actions: {
        jump: { gamepad: '0' },
        fire: { gamepad: '2' },
        move: { keys: ['LEFT'] },
      },
    });
  });

  it('registers connected and disconnected handlers', () => {
    const scene = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);
    expect(scene.input.gamepad.on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(scene.input.gamepad.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
  });

  it('isActionDown returns false when no gamepad connected', () => {
    const scene = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);
    expect(provider.isActionDown('jump')).toBe(false);
  });

  it('detects button press after connection', () => {
    const pad = makeGamepadStub();
    const scene = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);

    const connHandler = (scene.input.gamepad.on as ReturnType<typeof vi.fn>).mock.calls
      .find((c: any[]) => c[0] === 'connected')![1];
    connHandler(pad);

    scene.input.gamepad.getPad = vi.fn(() => pad);
    pad.buttons[0].pressed = true;
    expect(provider.isActionDown('jump')).toBe(true);
    expect(provider.isActionDown('fire')).toBe(false);
  });

  it('isActionDown returns false for non-gamepad bindings', () => {
    const pad = makeGamepadStub();
    const scene = makeTestScene(pad);
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);
    expect(provider.isActionDown('move')).toBe(false);
  });

  it('handles disconnection', () => {
    const pad = makeGamepadStub();
    const scene = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);

    const calls = (scene.input.gamepad.on as ReturnType<typeof vi.fn>).mock.calls;
    const connHandler = calls.find((c: any[]) => c[0] === 'connected')![1];
    const discHandler = calls.find((c: any[]) => c[0] === 'disconnected')![1];

    connHandler(pad);
    expect(provider.hasGamepad()).toBe(true);

    discHandler(pad);
    expect(provider.hasGamepad()).toBe(false);
    expect(provider.isActionDown('jump')).toBe(false);
  });

  it('getAxis returns analog stick values with deadzone', () => {
    const pad = makeGamepadStub();
    const scene = makeTestScene(pad);
    const provider = new GamepadProvider(actionMap, 0.15);
    provider.initFromScene(scene as any);

    pad.leftStick.x = 0.8;
    pad.leftStick.y = -0.5;
    const axis = provider.getAxis();
    expect(axis.x).toBe(0.8);
    expect(axis.y).toBe(-0.5);
  });

  it('getAxis applies deadzone filtering', () => {
    const pad = makeGamepadStub();
    const scene = makeTestScene(pad);
    const provider = new GamepadProvider(actionMap, 0.15);
    provider.initFromScene(scene as any);

    pad.leftStick.x = 0.1;
    pad.leftStick.y = 0.05;
    const axis = provider.getAxis();
    expect(axis.x).toBe(0);
    expect(axis.y).toBe(0);
  });

  it('detects already-connected gamepad on init', () => {
    const pad = makeGamepadStub();
    const scene = makeTestScene(pad);
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);
    expect(provider.hasGamepad()).toBe(true);
  });

  it('consumeAction always returns false', () => {
    const scene = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);
    expect(provider.consumeAction('jump')).toBe(false);
  });

  it('initFromScene only runs once', () => {
    const scene1 = makeTestScene();
    const scene2 = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene1 as any);
    provider.initFromScene(scene2 as any);
    expect(scene2.input.gamepad.on).not.toHaveBeenCalled();
  });

  it('destroy removes handlers', () => {
    const scene = makeTestScene();
    const provider = new GamepadProvider(actionMap);
    provider.initFromScene(scene as any);
    provider.destroy();
    expect(scene.input.gamepad.off).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(scene.input.gamepad.off).toHaveBeenCalledWith('disconnected', expect.any(Function));
  });
});
