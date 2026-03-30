import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

vi.mock('phaser', () => {
  return {
    default: {
      GameObjects: {
        Container: class {},
      },
    },
  };
});

import { makeTestScene } from '../helpers/TestScene';
import { Toast, type ToastConfig } from '../../src/ui/Toast';

function makeConfig(overrides?: Partial<ToastConfig>): ToastConfig {
  return { message: 'Saved!', ...overrides };
}

describe('Toast', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('show creates a text object with the message', () => {
    Toast.show(scene, makeConfig({ message: 'Hello' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const msgCall = calls.find((c: unknown[]) => c[2] === 'Hello');
    expect(msgCall).toBeTruthy();
  });

  it('defaults to bottom position (y near height - 60)', () => {
    Toast.show(scene, makeConfig());
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    // Default position is 'bottom': y = height - 60 + 20 = 560
    const yArg = calls[0][1];
    expect(yArg).toBe(560); // 600 - 60 + 20
  });

  it('top position places text near top of screen', () => {
    Toast.show(scene, makeConfig({ position: 'top' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    // 'top': y = 60 + 20 = 80
    const yArg = calls[0][1];
    expect(yArg).toBe(80);
  });

  it('center position places text at screen center', () => {
    Toast.show(scene, makeConfig({ position: 'center' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    // 'center': y = 300 + 20 = 320
    const yArg = calls[0][1];
    expect(yArg).toBe(320);
  });

  it('creates a tween for the slide-in animation', () => {
    Toast.show(scene, makeConfig());
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('text is created with alpha 0 for fade-in', () => {
    Toast.show(scene, makeConfig());
    const textObj = (scene.add.text as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(textObj.setAlpha).toHaveBeenCalledWith(0);
  });

  it('text is set to depth 8000 for overlay', () => {
    Toast.show(scene, makeConfig());
    const textObj = (scene.add.text as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(textObj.setDepth).toHaveBeenCalledWith(8000);
  });

  it('applies custom font size from config', () => {
    Toast.show(scene, makeConfig({ fontSize: '24px' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const styleArg = calls[0][3] as { fontSize: string };
    expect(styleArg.fontSize).toBe('24px');
  });
});
