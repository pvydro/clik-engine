import { Component } from '../Component';

export type OscillateAxis = 'x' | 'y' | 'both';

export class Oscillator extends Component {
  private amplitude: number;
  private frequency: number;
  private axis: OscillateAxis;
  private originX = 0;
  private originY = 0;
  private elapsed = 0;
  private phase: number;

  constructor(amplitude = 10, frequency = 1, axis: OscillateAxis = 'y', phase = 0) {
    super();
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.axis = axis;
    this.phase = phase;
  }

  onAttach(): void {
    this.originX = this.entity.x;
    this.originY = this.entity.y;
  }

  update(delta: number): void {
    this.elapsed += delta / 1000;
    const offset = Math.sin(this.elapsed * this.frequency * Math.PI * 2 + this.phase) * this.amplitude;

    if (this.axis === 'x' || this.axis === 'both') {
      this.entity.x = this.originX + offset;
    }
    if (this.axis === 'y' || this.axis === 'both') {
      this.entity.y = this.originY + offset;
    }
  }

  setAmplitude(amplitude: number): this {
    this.amplitude = amplitude;
    return this;
  }

  setFrequency(frequency: number): this {
    this.frequency = frequency;
    return this;
  }

  /** Reset origin to current entity position */
  resetOrigin(): void {
    this.originX = this.entity.x;
    this.originY = this.entity.y;
    this.elapsed = 0;
  }

  reset(): void {
    this.elapsed = 0;
    this.originX = this.entity.x;
    this.originY = this.entity.y;
  }
}
