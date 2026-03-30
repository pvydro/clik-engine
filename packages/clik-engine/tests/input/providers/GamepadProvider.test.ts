import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../../helpers/TestScene';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { GamepadProvider } from '../../../src/input/providers/GamepadProvider';
import { ActionMap } from '../../../src/input/ActionMap';

function makeGamepadStub() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    total: 0,
    pad1: null as any,
    getPad: vi.fn(() => null),
  };
}

describe('GamepadProvider', () => {
  let scene: ReturnType<typeof makeTestScene>;
  let actionMap: ActionMap;
  let gamepadStub: ReturnType<typeof makeGamepadStub>;

  beforeEach(() => {
    scene = makeTestScene();
    gamepadStub = makeGamepadStub();
    (scene.input as any).gamepad = gamepadStub;
    actionMap = new ActionMap({
      actions: {
        jump: { gamepad: '0' },
        fire: { gamepad: '2' },
      },
    });
  });

  it('registers connected and disconnected handlers', () => {
    new GamepadProvider(scene as any, actionMap);
    expect(gamepadStub.on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(gamepadStub.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
  });

  it('hasGamepad returns false initially', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    expect(provider.hasGamepad()).toBe(false);
  });

  it('hasGamepad returns true after gamepad connects', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    // Simulate gamepad connection
    const connectedHandler = gamepadStub.on.mock.calls.find(
      (c: any[]) => c[0] === 'connected',
    )![1];
    connectedHandler({ index: 0, id: 'Test Gamepad' });

    expect(provider.hasGamepad()).toBe(true);
  });

  it('hasGamepad returns false after gamepad disconnects', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    const connectedHandler = gamepadStub.on.mock.calls.find(
      (c: any[]) => c[0] === 'connected',
    )![1];
    const disconnectedHandler = gamepadStub.on.mock.calls.find(
      (c: any[]) => c[0] === 'disconnected',
    )![1];

    connectedHandler({ index: 0, id: 'Test Gamepad' });
    disconnectedHandler({ index: 0, id: 'Test Gamepad' });

    expect(provider.hasGamepad()).toBe(false);
  });

  it('isActionDown checks the correct button', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    // Connect gamepad
    const connectedHandler = gamepadStub.on.mock.calls.find(
      (c: any[]) => c[0] === 'connected',
    )![1];
    connectedHandler({ index: 0, id: 'Test Gamepad' });

    // Mock getPad to return a gamepad with buttons
    const mockPad = {
      buttons: [
        { pressed: true },  // button 0 (jump)
        { pressed: false }, // button 1
        { pressed: false }, // button 2 (fire)
      ],
      leftStick: { x: 0, y: 0 },
    };
    gamepadStub.getPad.mockReturnValue(mockPad);

    expect(provider.isActionDown('jump')).toBe(true);
    expect(provider.isActionDown('fire')).toBe(false);
  });

  it('isActionDown returns false when no gamepad connected', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    expect(provider.isActionDown('jump')).toBe(false);
  });

  it('getAxis returns stick values with deadzone applied', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    const connectedHandler = gamepadStub.on.mock.calls.find(
      (c: any[]) => c[0] === 'connected',
    )![1];
    connectedHandler({ index: 0, id: 'Test Gamepad' });

    const mockPad = {
      buttons: [],
      leftStick: { x: 0.5, y: -0.3 },
    };
    gamepadStub.getPad.mockReturnValue(mockPad);

    const axis = provider.getAxis();
    expect(axis.x).toBe(0.5);
    expect(axis.y).toBe(-0.3);
  });

  it('getAxis applies deadzone — small values become 0', () => {
    const provider = new GamepadProvider(scene as any, actionMap, 0.2);
    const connectedHandler = gamepadStub.on.mock.calls.find(
      (c: any[]) => c[0] === 'connected',
    )![1];
    connectedHandler({ index: 0, id: 'Test Gamepad' });

    const mockPad = {
      buttons: [],
      leftStick: { x: 0.1, y: -0.05 },
    };
    gamepadStub.getPad.mockReturnValue(mockPad);

    const axis = provider.getAxis();
    expect(axis.x).toBe(0);
    expect(axis.y).toBe(0);
  });

  it('getAxis returns zero when no gamepad', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    const axis = provider.getAxis();
    expect(axis).toEqual({ x: 0, y: 0 });
  });

  it('destroy removes event handlers', () => {
    const provider = new GamepadProvider(scene as any, actionMap);
    provider.destroy();
    expect(gamepadStub.off).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(gamepadStub.off).toHaveBeenCalledWith('disconnected', expect.any(Function));
  });

  it('detects already-connected gamepads', () => {
    gamepadStub.total = 1;
    gamepadStub.pad1 = { index: 0 };
    const provider = new GamepadProvider(scene as any, actionMap);
    expect(provider.hasGamepad()).toBe(true);
  });
});
