import { ConsoleReporter } from '../debug/ConsoleReporter';

interface InputFrame {
  time: number;
  actions: Record<string, boolean>;
}

export class InputRecorder {
  private frames: InputFrame[] = [];
  private recording = false;
  private playing = false;
  private playbackIndex = 0;
  private playbackStartTime = 0;
  private currentFrame: Record<string, boolean> = {};

  startRecording(): void {
    this.frames = [];
    this.recording = true;
    ConsoleReporter.input('Input recording started');
  }

  stopRecording(): InputFrame[] {
    this.recording = false;
    ConsoleReporter.input(`Input recording stopped: ${this.frames.length} frames`);
    return this.frames;
  }

  /** Call each frame during recording with current action states */
  recordFrame(time: number, actions: Record<string, boolean>): void {
    if (!this.recording) return;
    this.frames.push({ time, actions: { ...actions } });
  }

  startPlayback(frames?: InputFrame[]): void {
    if (frames) this.frames = frames;
    if (this.frames.length === 0) return;
    this.playing = true;
    this.playbackIndex = 0;
    this.playbackStartTime = this.frames[0].time;
    this.currentFrame = {};
    ConsoleReporter.input('Input playback started');
  }

  stopPlayback(): void {
    this.playing = false;
    this.currentFrame = {};
    ConsoleReporter.input('Input playback stopped');
  }

  /** Call each frame during playback. Returns action states for the current time. */
  getPlaybackFrame(currentTime: number): Record<string, boolean> | null {
    if (!this.playing || this.frames.length === 0) return null;

    const elapsed = currentTime - this.playbackStartTime;

    // Advance to the correct frame
    while (
      this.playbackIndex < this.frames.length &&
      this.frames[this.playbackIndex].time - this.frames[0].time <= elapsed
    ) {
      this.currentFrame = this.frames[this.playbackIndex].actions;
      this.playbackIndex++;
    }

    // Check if playback is complete
    if (this.playbackIndex >= this.frames.length) {
      this.playing = false;
      ConsoleReporter.input('Input playback complete');
      return null;
    }

    return this.currentFrame;
  }

  isRecording(): boolean {
    return this.recording;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Export frames as JSON string */
  exportJSON(): string {
    return JSON.stringify(this.frames);
  }

  /** Import frames from JSON string */
  importJSON(json: string): void {
    this.frames = JSON.parse(json);
    ConsoleReporter.input(`Imported ${this.frames.length} input frames`);
  }

  getFrameCount(): number {
    return this.frames.length;
  }
}
