import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    input: vi.fn(),
  },
}));

import { InputRecorder } from '../../src/input/InputRecorder';

describe('InputRecorder', () => {
  it('records frames', () => {
    const recorder = new InputRecorder();
    recorder.startRecording();
    recorder.recordFrame(0, { jump: true, move: false });
    recorder.recordFrame(16, { jump: false, move: true });
    const frames = recorder.stopRecording();
    expect(frames).toHaveLength(2);
    expect(frames[0].actions.jump).toBe(true);
    expect(frames[1].actions.move).toBe(true);
  });

  it('does not record when not recording', () => {
    const recorder = new InputRecorder();
    recorder.recordFrame(0, { jump: true });
    expect(recorder.getFrameCount()).toBe(0);
  });

  it('exports and imports JSON', () => {
    const recorder = new InputRecorder();
    recorder.startRecording();
    recorder.recordFrame(0, { a: true });
    recorder.recordFrame(100, { a: false });
    recorder.stopRecording();

    const json = recorder.exportJSON();
    const recorder2 = new InputRecorder();
    recorder2.importJSON(json);
    expect(recorder2.getFrameCount()).toBe(2);
  });

  it('plays back frames', () => {
    const recorder = new InputRecorder();
    recorder.startRecording();
    recorder.recordFrame(0, { jump: false });
    recorder.recordFrame(100, { jump: true });
    recorder.recordFrame(200, { jump: false });
    recorder.stopRecording();

    recorder.startPlayback();
    expect(recorder.isPlaying()).toBe(true);

    // At time 0, should get first frame
    const f1 = recorder.getPlaybackFrame(0);
    expect(f1).toEqual({ jump: false });

    // At time 100+, should get second frame
    const f2 = recorder.getPlaybackFrame(100);
    expect(f2).toEqual({ jump: true });
  });

  it('stops playback when complete', () => {
    const recorder = new InputRecorder();
    recorder.startRecording();
    recorder.recordFrame(0, { a: true });
    recorder.recordFrame(50, { a: false });
    recorder.stopRecording();

    recorder.startPlayback();
    recorder.getPlaybackFrame(0);
    recorder.getPlaybackFrame(100); // past end
    expect(recorder.isPlaying()).toBe(false);
  });

  it('tracks recording/playing state', () => {
    const recorder = new InputRecorder();
    expect(recorder.isRecording()).toBe(false);
    expect(recorder.isPlaying()).toBe(false);

    recorder.startRecording();
    expect(recorder.isRecording()).toBe(true);
    recorder.stopRecording();
    expect(recorder.isRecording()).toBe(false);
  });
});
