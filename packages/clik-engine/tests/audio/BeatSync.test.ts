import { describe, it, expect, vi } from 'vitest';
import { BeatSync } from '../../src/audio/BeatSync';

describe('BeatSync', () => {
  it('starts inactive', () => {
    const beat = new BeatSync({ bpm: 120 });
    expect(beat.isActive).toBe(false);
  });

  it('start activates', () => {
    const beat = new BeatSync({ bpm: 120 });
    beat.start();
    expect(beat.isActive).toBe(true);
  });

  it('fires beat callback at correct interval', () => {
    const cb = vi.fn();
    const beat = new BeatSync({ bpm: 120 }); // 500ms per beat
    beat.onBeat(cb);
    beat.start();

    beat.update(250); // half a beat
    expect(cb).not.toHaveBeenCalled();

    beat.update(300); // 550ms total → 1 beat
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('fires measure callback every N beats', () => {
    const beatCb = vi.fn();
    const measureCb = vi.fn();
    const beat = new BeatSync({ bpm: 600, beatsPerMeasure: 4 }); // 100ms per beat
    beat.onBeat(beatCb);
    beat.onMeasure(measureCb);
    beat.start();

    // Simulate 4 beats
    beat.update(400);
    expect(beatCb).toHaveBeenCalledTimes(4);
    expect(measureCb).toHaveBeenCalledOnce();
    expect(measureCb).toHaveBeenCalledWith(1);
  });

  it('getBeatProgress returns 0-1', () => {
    const beat = new BeatSync({ bpm: 120 }); // 500ms per beat
    beat.start();
    beat.update(250);
    expect(beat.getBeatProgress()).toBeCloseTo(0.5, 1);
  });

  it('quantize snaps to nearest beat', () => {
    const beat = new BeatSync({ bpm: 120 }); // 500ms per beat
    expect(beat.quantize(300)).toBe(500);
    expect(beat.quantize(700)).toBe(500);
    expect(beat.quantize(800)).toBe(1000);
  });

  it('setBPM updates interval', () => {
    const beat = new BeatSync({ bpm: 60 });
    expect(beat.getBeatInterval()).toBe(1000);
    beat.setBPM(120);
    expect(beat.getBeatInterval()).toBe(500);
    expect(beat.getBPM()).toBe(120);
  });

  it('stop deactivates', () => {
    const beat = new BeatSync({ bpm: 120 });
    beat.start();
    beat.stop();
    expect(beat.isActive).toBe(false);
  });

  it('does not fire callbacks when inactive', () => {
    const cb = vi.fn();
    const beat = new BeatSync({ bpm: 120 });
    beat.onBeat(cb);
    beat.update(1000); // not started
    expect(cb).not.toHaveBeenCalled();
  });

  it('getTotalBeats tracks cumulative beats', () => {
    const beat = new BeatSync({ bpm: 600 }); // 100ms per beat
    beat.start();
    beat.update(500);
    expect(beat.getTotalBeats()).toBe(5);
  });

  it('getTotalMeasures tracks cumulative measures', () => {
    const beat = new BeatSync({ bpm: 600, beatsPerMeasure: 4 });
    beat.start();
    beat.update(800);
    expect(beat.getTotalMeasures()).toBe(2);
  });

  it('reset clears counters', () => {
    const beat = new BeatSync({ bpm: 600 });
    beat.start();
    beat.update(500);
    beat.reset();
    expect(beat.getTotalBeats()).toBe(0);
    expect(beat.getTotalMeasures()).toBe(0);
  });
});
