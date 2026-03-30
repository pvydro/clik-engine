import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { ShaderManager } from '../../src/effects/ShaderManager';
import { ConsoleReporter } from '../../src/debug/ConsoleReporter';

function makePostFX() {
  return {
    addBlur: vi.fn(),
    addBloom: vi.fn(),
    addVignette: vi.fn(),
    addPixelate: vi.fn(),
    addColorMatrix: vi.fn(() => ({ name: 'colorMatrix' })),
    addBarrel: vi.fn(),
    addGradient: vi.fn(),
    addDisplacement: vi.fn(),
    addWipe: vi.fn(() => ({ name: 'wipe' })),
    clear: vi.fn(),
  };
}

function makeScene(withFX = true) {
  const postFX = withFX ? makePostFX() : undefined;
  const cam = { postFX } as unknown as Phaser.Cameras.Scene2D.Camera;
  return {
    cameras: { main: cam },
    time: {
      delayedCall: vi.fn((_dur: number, cb: () => void) => {
        cb();
        return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 };
      }),
    },
    _postFX: postFX,
  } as unknown as Phaser.Scene & { _postFX: ReturnType<typeof makePostFX> | undefined };
}

describe('ShaderManager', () => {
  let scene: ReturnType<typeof makeScene>;
  let shader: ShaderManager;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = makeScene(true);
    shader = new ShaderManager(scene);
  });

  describe('blur', () => {
    it('calls postFX.addBlur with defaults', () => {
      shader.blur();
      expect(scene._postFX!.addBlur).toHaveBeenCalledWith(0, 1, 1);
    });

    it('calls postFX.addBlur with custom params', () => {
      shader.blur(2, 3);
      expect(scene._postFX!.addBlur).toHaveBeenCalledWith(2, 3, 3);
    });

    it('returns this for chaining', () => {
      expect(shader.blur()).toBe(shader);
    });

    it('logs effect applied', () => {
      shader.blur();
      expect(ConsoleReporter.engine).toHaveBeenCalledWith('Effect: blur applied');
    });
  });

  describe('bloom', () => {
    it('calls postFX.addBloom with defaults', () => {
      shader.bloom();
      expect(scene._postFX!.addBloom).toHaveBeenCalledWith(0xffffff, 1, 1);
    });

    it('calls postFX.addBloom with custom params', () => {
      shader.bloom(0xff0000, 2, 3);
      expect(scene._postFX!.addBloom).toHaveBeenCalledWith(0xff0000, 2, 3);
    });

    it('returns this for chaining', () => {
      expect(shader.bloom()).toBe(shader);
    });
  });

  describe('vignette', () => {
    it('calls postFX.addVignette with defaults', () => {
      shader.vignette();
      expect(scene._postFX!.addVignette).toHaveBeenCalledWith(0.5, 0.5, 0.5, 0.5);
    });

    it('calls postFX.addVignette with custom params', () => {
      shader.vignette(0.3, 0.4, 0.6, 0.8);
      expect(scene._postFX!.addVignette).toHaveBeenCalledWith(0.3, 0.4, 0.6, 0.8);
    });

    it('returns this for chaining', () => {
      expect(shader.vignette()).toBe(shader);
    });
  });

  describe('pixelate', () => {
    it('calls postFX.addPixelate with default amount', () => {
      shader.pixelate();
      expect(scene._postFX!.addPixelate).toHaveBeenCalledWith(4);
    });

    it('calls postFX.addPixelate with custom amount', () => {
      shader.pixelate(8);
      expect(scene._postFX!.addPixelate).toHaveBeenCalledWith(8);
    });

    it('returns this for chaining', () => {
      expect(shader.pixelate()).toBe(shader);
    });
  });

  describe('barrel', () => {
    it('calls postFX.addBarrel with default amount', () => {
      shader.barrel();
      expect(scene._postFX!.addBarrel).toHaveBeenCalledWith(1);
    });

    it('calls postFX.addBarrel with custom amount', () => {
      shader.barrel(2.5);
      expect(scene._postFX!.addBarrel).toHaveBeenCalledWith(2.5);
    });

    it('returns this for chaining', () => {
      expect(shader.barrel()).toBe(shader);
    });
  });

  describe('gradient', () => {
    it('calls postFX.addGradient with defaults', () => {
      shader.gradient();
      expect(scene._postFX!.addGradient).toHaveBeenCalledWith(
        0xff0000, 0x0000ff, 0.2, undefined, undefined, undefined, 0,
      );
    });

    it('calls postFX.addGradient with custom params', () => {
      shader.gradient(0x00ff00, 0xff00ff, 0.5, 10);
      expect(scene._postFX!.addGradient).toHaveBeenCalledWith(
        0x00ff00, 0xff00ff, 0.5, undefined, undefined, undefined, 10,
      );
    });

    it('returns this for chaining', () => {
      expect(shader.gradient()).toBe(shader);
    });
  });

  describe('colorMatrix', () => {
    it('returns result of postFX.addColorMatrix', () => {
      const result = shader.colorMatrix();
      expect(result).toEqual({ name: 'colorMatrix' });
    });
  });

  describe('displacement', () => {
    it('calls postFX.addDisplacement', () => {
      shader.displacement('noise', 2, 3);
      expect(scene._postFX!.addDisplacement).toHaveBeenCalledWith('noise', 2, 3);
    });

    it('returns this for chaining', () => {
      expect(shader.displacement('key')).toBe(shader);
    });
  });

  describe('wipe', () => {
    it('returns result of postFX.addWipe', () => {
      const result = shader.wipe(0.5, 1);
      expect(result).toEqual({ name: 'wipe' });
    });
  });

  describe('clearAll', () => {
    it('calls postFX.clear', () => {
      shader.clearAll();
      expect(scene._postFX!.clear).toHaveBeenCalled();
    });

    it('logs effects cleared', () => {
      shader.clearAll();
      expect(ConsoleReporter.engine).toHaveBeenCalledWith('Effects cleared');
    });

    it('returns this for chaining', () => {
      expect(shader.clearAll()).toBe(shader);
    });
  });

  describe('hasFX guard (no postFX)', () => {
    let noFxShader: ShaderManager;

    beforeEach(() => {
      const noFxScene = makeScene(false);
      noFxShader = new ShaderManager(noFxScene);
    });

    it('blur returns this without calling addBlur', () => {
      expect(noFxShader.blur()).toBe(noFxShader);
      expect(ConsoleReporter.error).toHaveBeenCalledWith('PostFX not available (requires WebGL renderer)');
    });

    it('bloom returns this without calling addBloom', () => {
      expect(noFxShader.bloom()).toBe(noFxShader);
    });

    it('vignette returns this without calling addVignette', () => {
      expect(noFxShader.vignette()).toBe(noFxShader);
    });

    it('pixelate returns this without calling addPixelate', () => {
      expect(noFxShader.pixelate()).toBe(noFxShader);
    });

    it('barrel returns this without calling addBarrel', () => {
      expect(noFxShader.barrel()).toBe(noFxShader);
    });

    it('gradient returns this without calling addGradient', () => {
      expect(noFxShader.gradient()).toBe(noFxShader);
    });

    it('colorMatrix returns null', () => {
      expect(noFxShader.colorMatrix()).toBeNull();
    });

    it('wipe returns null', () => {
      expect(noFxShader.wipe()).toBeNull();
    });

    it('clearAll returns this when no postFX (no crash)', () => {
      // clearAll checks this.camera.postFX directly, not hasFX()
      // With no postFX the if-guard prevents calling clear
      expect(noFxShader.clearAll()).toBe(noFxShader);
    });
  });

  describe('applyToObject', () => {
    it('returns effect methods for object with postFX', () => {
      const obj = {
        postFX: {
          addBlur: vi.fn(),
          addBloom: vi.fn(),
          addGlow: vi.fn(),
          addShadow: vi.fn(),
          clear: vi.fn(),
        },
      } as unknown as Phaser.GameObjects.GameObject;

      const fx = shader.applyToObject(obj);
      expect(fx.blur).toBeInstanceOf(Function);
      expect(fx.bloom).toBeInstanceOf(Function);
      expect(fx.glow).toBeInstanceOf(Function);
      expect(fx.shadow).toBeInstanceOf(Function);
      expect(fx.clear).toBeInstanceOf(Function);
    });

    it('delegates blur to object postFX', () => {
      const addBlur = vi.fn();
      const obj = {
        postFX: { addBlur, addBloom: vi.fn(), addGlow: vi.fn(), addShadow: vi.fn(), clear: vi.fn() },
      } as unknown as Phaser.GameObjects.GameObject;

      const fx = shader.applyToObject(obj);
      fx.blur(1, 2);
      expect(addBlur).toHaveBeenCalledWith(1, 2, 2);
    });

    it('delegates bloom to object postFX', () => {
      const addBloom = vi.fn();
      const obj = {
        postFX: { addBlur: vi.fn(), addBloom, addGlow: vi.fn(), addShadow: vi.fn(), clear: vi.fn() },
      } as unknown as Phaser.GameObjects.GameObject;

      const fx = shader.applyToObject(obj);
      fx.bloom(0xff0000, 2);
      expect(addBloom).toHaveBeenCalledWith(0xff0000, 2);
    });

    it('delegates glow to object postFX', () => {
      const addGlow = vi.fn();
      const obj = {
        postFX: { addBlur: vi.fn(), addBloom: vi.fn(), addGlow, addShadow: vi.fn(), clear: vi.fn() },
      } as unknown as Phaser.GameObjects.GameObject;

      const fx = shader.applyToObject(obj);
      fx.glow(0x00ff00, 8, 0.5);
      expect(addGlow).toHaveBeenCalledWith(0x00ff00, 8, 0, false, 0.5);
    });

    it('delegates shadow to object postFX', () => {
      const addShadow = vi.fn();
      const obj = {
        postFX: { addBlur: vi.fn(), addBloom: vi.fn(), addGlow: vi.fn(), addShadow, clear: vi.fn() },
      } as unknown as Phaser.GameObjects.GameObject;

      const fx = shader.applyToObject(obj);
      fx.shadow(3, 4, 0.2, 2);
      expect(addShadow).toHaveBeenCalledWith(3, 4, 0.2, 2);
    });

    it('delegates clear to object postFX', () => {
      const clear = vi.fn();
      const obj = {
        postFX: { addBlur: vi.fn(), addBloom: vi.fn(), addGlow: vi.fn(), addShadow: vi.fn(), clear },
      } as unknown as Phaser.GameObjects.GameObject;

      const fx = shader.applyToObject(obj);
      fx.clear();
      expect(clear).toHaveBeenCalled();
    });

    it('returns no-op methods when object has no FX support', () => {
      const obj = {} as unknown as Phaser.GameObjects.GameObject;
      const fx = shader.applyToObject(obj);
      expect(ConsoleReporter.error).toHaveBeenCalledWith('Object does not support FX');
      // Should not throw
      fx.blur();
      fx.bloom();
      fx.glow();
      fx.shadow();
      fx.clear();
    });
  });

  describe('temporaryEffect', () => {
    it('applies glow and schedules removal', () => {
      const removeFn = vi.fn();
      const fxObj = { postFX: { addGlow: vi.fn(() => 'glowFx'), remove: removeFn } };

      // Use scene with immediate delayedCall
      ShaderManager.temporaryEffect(
        scene,
        fxObj as unknown as Phaser.GameObjects.GameObject,
        'glow',
      );

      expect(fxObj.postFX.addGlow).toHaveBeenCalled();
      // delayedCall fires immediately in our mock, so remove should be called
      expect(removeFn).toHaveBeenCalledWith('glowFx');
    });

    it('applies bloom effect', () => {
      const fxObj = { postFX: { addBloom: vi.fn(() => 'bloomFx'), remove: vi.fn() } };

      ShaderManager.temporaryEffect(
        scene,
        fxObj as unknown as Phaser.GameObjects.GameObject,
        'bloom',
        { color: 0xff0000, strength: 2 },
      );

      expect(fxObj.postFX.addBloom).toHaveBeenCalledWith(0xff0000, 2, 2);
    });

    it('applies shine effect', () => {
      const fxObj = { postFX: { addShine: vi.fn(() => 'shineFx'), remove: vi.fn() } };

      ShaderManager.temporaryEffect(
        scene,
        fxObj as unknown as Phaser.GameObjects.GameObject,
        'shine',
      );

      expect(fxObj.postFX.addShine).toHaveBeenCalledWith(1, 0.5, 5);
    });

    it('does nothing when object has no postFX', () => {
      const obj = {} as unknown as Phaser.GameObjects.GameObject;
      // Should not throw
      ShaderManager.temporaryEffect(scene, obj, 'glow');
      expect(scene.time.delayedCall).not.toHaveBeenCalled();
    });

    it('respects custom duration', () => {
      const fxObj = { postFX: { addGlow: vi.fn(() => 'fx'), remove: vi.fn() } };

      // Replace delayedCall to capture duration
      let capturedDur = 0;
      (scene.time as Record<string, unknown>).delayedCall = vi.fn((dur: number, cb: () => void) => {
        capturedDur = dur;
        cb();
        return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 };
      });

      ShaderManager.temporaryEffect(
        scene,
        fxObj as unknown as Phaser.GameObjects.GameObject,
        'glow',
        { duration: 500 },
      );

      expect(capturedDur).toBe(500);
    });
  });
});
