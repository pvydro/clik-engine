import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface ShaderUniform {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'int';
  value: number | number[];
}

/**
 * Custom shader pipeline for advanced post-processing effects.
 * Allows registering GLSL fragment shaders with typed uniforms.
 */
export class CustomShaderPipeline {
  private scene: Phaser.Scene;
  private shaders: Map<string, { uniforms: Map<string, ShaderUniform> }> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Register a custom fragment shader.
   * Note: Actual WebGL shader compilation requires Phaser's pipeline API.
   * This provides a management layer for custom shader definitions.
   */
  register(name: string, _fragmentSrc: string, uniforms?: ShaderUniform[]): this {
    const uniformMap = new Map<string, ShaderUniform>();
    if (uniforms) {
      for (const u of uniforms) {
        uniformMap.set(u.name, { ...u });
      }
    }
    this.shaders.set(name, { uniforms: uniformMap });
    ConsoleReporter.engine(`Custom shader registered: ${name}`);
    return this;
  }

  /** Update a uniform value for a registered shader */
  setUniform(shaderName: string, uniformName: string, value: number | number[]): this {
    const shader = this.shaders.get(shaderName);
    if (!shader) {
      ConsoleReporter.error(`Shader '${shaderName}' not found`);
      return this;
    }
    const uniform = shader.uniforms.get(uniformName);
    if (!uniform) {
      ConsoleReporter.error(`Uniform '${uniformName}' not found in shader '${shaderName}'`);
      return this;
    }
    uniform.value = value;
    return this;
  }

  /** Get a uniform's current value */
  getUniform(shaderName: string, uniformName: string): number | number[] | undefined {
    return this.shaders.get(shaderName)?.uniforms.get(uniformName)?.value;
  }

  /** Check if a shader is registered */
  has(name: string): boolean {
    return this.shaders.has(name);
  }

  /** Remove a registered shader */
  remove(name: string): this {
    this.shaders.delete(name);
    return this;
  }

  /** Remove all registered shaders */
  clear(): void {
    this.shaders.clear();
  }

  /** Get all registered shader names */
  getNames(): string[] {
    return Array.from(this.shaders.keys());
  }

  destroy(): void {
    this.clear();
  }
}

// ── Built-in shader effect definitions ────────────────────────────────────

/** Predefined shader uniform sets for common effects */
export const ShaderEffects = {
  /** Chromatic aberration — RGB channel offset */
  chromaticAberration: (strength = 2): ShaderUniform[] => [
    { name: 'strength', type: 'float', value: strength },
  ],

  /** CRT scanlines */
  scanlines: (density = 1, brightness = 0.7): ShaderUniform[] => [
    { name: 'density', type: 'float', value: density },
    { name: 'brightness', type: 'float', value: brightness },
  ],

  /** Heat wave distortion */
  heatWave: (speed = 1, amplitude = 0.01): ShaderUniform[] => [
    { name: 'speed', type: 'float', value: speed },
    { name: 'amplitude', type: 'float', value: amplitude },
    { name: 'time', type: 'float', value: 0 },
  ],

  /** Outline/edge detection */
  outline: (color: number[] = [1, 1, 1], thickness = 1): ShaderUniform[] => [
    { name: 'outlineColor', type: 'vec3', value: color },
    { name: 'thickness', type: 'float', value: thickness },
  ],
};
