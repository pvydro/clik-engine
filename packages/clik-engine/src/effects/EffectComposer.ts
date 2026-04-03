import Phaser from 'phaser';
import { ImpactDistortion } from './ImpactDistortion';
import { ChromaticAberration } from './ChromaticAberration';
import { GlitchEffect } from './GlitchEffect';
import { TimeEffects } from './TimeEffects';

export interface ComposedEffect {
  name: string;
  steps: EffectStep[];
}

export type EffectStep =
  | { type: 'distortion'; config?: { intensity?: number; duration?: number } }
  | { type: 'chromatic'; config?: { intensity?: number; duration?: number } }
  | { type: 'glitch'; config?: { intensity?: number; duration?: number } }
  | { type: 'hitstop'; frames: number }
  | { type: 'slowmo'; scale: number; duration: number; resume?: 'instant' | 'gradual' }
  | { type: 'shake'; duration?: number; intensity?: number }
  | { type: 'flash'; duration?: number; r?: number; g?: number; b?: number };

/**
 * Chains multiple effects together for impactful moments.
 *
 * Usage:
 * ```
 * const composer = new EffectComposer(scene);
 * composer.play('criticalHit', worldX, worldY);
 * composer.play(EffectComposer.presets.lowHealth);
 * ```
 */
export class EffectComposer {
  private scene: Phaser.Scene;
  private distortion: ImpactDistortion;
  private chromatic: ChromaticAberration;
  private glitch: GlitchEffect;
  private timeEffects: TimeEffects;
  private presets: Map<string, ComposedEffect> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.distortion = new ImpactDistortion(scene);
    this.chromatic = new ChromaticAberration(scene);
    this.glitch = new GlitchEffect(scene);
    this.timeEffects = new TimeEffects(scene);

    this.registerDefaults();
  }

  /** Register a custom effect preset */
  register(effect: ComposedEffect): this {
    this.presets.set(effect.name, effect);
    return this;
  }

  /** Play a registered preset by name, optionally at a world position */
  play(nameOrEffect: string | ComposedEffect, worldX = 0, worldY = 0): void {
    const effect = typeof nameOrEffect === 'string'
      ? this.presets.get(nameOrEffect)
      : nameOrEffect;
    if (!effect) return;

    for (const step of effect.steps) {
      this.executeStep(step, worldX, worldY);
    }
  }

  /** Get a registered preset */
  getPreset(name: string): ComposedEffect | undefined {
    return this.presets.get(name);
  }

  /** Get all preset names */
  getPresetNames(): string[] {
    return Array.from(this.presets.keys());
  }

  /** Access individual effect systems */
  getDistortion(): ImpactDistortion { return this.distortion; }
  getChromatic(): ChromaticAberration { return this.chromatic; }
  getGlitch(): GlitchEffect { return this.glitch; }
  getTimeEffects(): TimeEffects { return this.timeEffects; }

  private executeStep(step: EffectStep, worldX: number, worldY: number): void {
    const cam = this.scene.cameras.main;

    switch (step.type) {
      case 'distortion':
        this.distortion.trigger(worldX, worldY, step.config);
        break;
      case 'chromatic':
        this.chromatic.pulse(step.config);
        break;
      case 'glitch':
        this.glitch.trigger(step.config);
        break;
      case 'hitstop':
        this.timeEffects.hitstop(step.frames);
        break;
      case 'slowmo':
        this.timeEffects.slowMo(step.scale, step.duration, step.resume);
        break;
      case 'shake':
        cam.shake(step.duration ?? 200, step.intensity ?? 0.01);
        break;
      case 'flash':
        cam.flash(step.duration ?? 100, step.r ?? 255, step.g ?? 255, step.b ?? 255);
        break;
    }
  }

  private registerDefaults(): void {
    this.register({
      name: 'criticalHit',
      steps: [
        { type: 'hitstop', frames: 4 },
        { type: 'chromatic', config: { duration: 150 } },
        { type: 'shake', duration: 200, intensity: 0.015 },
        { type: 'distortion', config: { duration: 200 } },
      ],
    });

    this.register({
      name: 'heavyImpact',
      steps: [
        { type: 'hitstop', frames: 6 },
        { type: 'shake', duration: 350, intensity: 0.02 },
        { type: 'flash', duration: 50, r: 255, g: 255, b: 255 },
      ],
    });

    this.register({
      name: 'death',
      steps: [
        { type: 'hitstop', frames: 8 },
        { type: 'slowmo', scale: 0.3, duration: 1000, resume: 'gradual' },
        { type: 'chromatic', config: { duration: 500 } },
      ],
    });

    this.register({
      name: 'dashBurst',
      steps: [
        { type: 'distortion', config: { duration: 150, intensity: 0.2 } },
        { type: 'chromatic', config: { duration: 100 } },
      ],
    });

    this.register({
      name: 'corruption',
      steps: [
        { type: 'glitch', config: { duration: 300, intensity: 0.7 } },
        { type: 'chromatic', config: { duration: 200 } },
      ],
    });
  }
}
