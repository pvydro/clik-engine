import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { CustomShaderPipeline, ShaderEffects } from '../../src/effects/CustomShader';
import { ConsoleReporter } from '../../src/debug/ConsoleReporter';

describe('CustomShaderPipeline', () => {
  let pipeline: CustomShaderPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    pipeline = new CustomShaderPipeline({} as import('phaser').default.Scene);
  });

  it('registers a shader', () => {
    pipeline.register('test', 'void main() {}');
    expect(pipeline.has('test')).toBe(true);
    expect(pipeline.getNames()).toEqual(['test']);
  });

  it('registers shader with uniforms', () => {
    pipeline.register('blur', 'void main() {}', [
      { name: 'strength', type: 'float', value: 1.0 },
    ]);
    expect(pipeline.getUniform('blur', 'strength')).toBe(1.0);
  });

  it('updates uniform values', () => {
    pipeline.register('blur', '', [{ name: 'strength', type: 'float', value: 1 }]);
    pipeline.setUniform('blur', 'strength', 2.5);
    expect(pipeline.getUniform('blur', 'strength')).toBe(2.5);
  });

  it('logs error for missing shader on setUniform', () => {
    pipeline.setUniform('missing', 'foo', 1);
    expect(ConsoleReporter.error).toHaveBeenCalledWith(expect.stringContaining("'missing' not found"), expect.any(String));
  });

  it('logs error for missing uniform', () => {
    pipeline.register('test', '');
    pipeline.setUniform('test', 'missing', 1);
    expect(ConsoleReporter.error).toHaveBeenCalledWith(expect.stringContaining("'missing' not found"), expect.any(String));
  });

  it('removes a shader', () => {
    pipeline.register('test', '');
    pipeline.remove('test');
    expect(pipeline.has('test')).toBe(false);
  });

  it('clears all shaders', () => {
    pipeline.register('a', '');
    pipeline.register('b', '');
    pipeline.clear();
    expect(pipeline.getNames()).toHaveLength(0);
  });

  it('chains register, setUniform, remove', () => {
    const result = pipeline.register('a', '').remove('a');
    expect(result).toBe(pipeline);
  });
});

describe('ShaderEffects', () => {
  it('chromaticAberration returns uniforms', () => {
    const uniforms = ShaderEffects.chromaticAberration(3);
    expect(uniforms).toHaveLength(1);
    expect(uniforms[0]).toMatchObject({ name: 'strength', value: 3 });
  });

  it('scanlines returns uniforms', () => {
    const uniforms = ShaderEffects.scanlines(2, 0.5);
    expect(uniforms).toHaveLength(2);
  });

  it('heatWave returns uniforms with time', () => {
    const uniforms = ShaderEffects.heatWave();
    expect(uniforms.find(u => u.name === 'time')).toBeDefined();
  });

  it('outline returns uniforms', () => {
    const uniforms = ShaderEffects.outline([1, 0, 0], 2);
    expect(uniforms).toHaveLength(2);
    expect(uniforms[0]).toMatchObject({ name: 'outlineColor', value: [1, 0, 0] });
  });
});
