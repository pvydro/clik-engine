/** Configuration for PlaytestReporter plugin. */
export interface PlaytestConfig {
  /** EventBus event names to track (e.g. 'player:death', 'score:changed'). Default: common game events. */
  trackEvents?: string[];
  /** How often to sample entity counts (in frames). Default: 60. */
  entitySampleRate?: number;
  /** How often to sample performance metrics (in frames). Default: 60. */
  performanceSampleRate?: number;
  /** Seconds of no input before an idle period is recorded. Default: 5. */
  idleThreshold?: number;
  /** FPS below this value is considered a drop. Default: 30. */
  fpsDropThreshold?: number;
  /** Start recording automatically on init. Default: true. */
  autoStart?: boolean;
}

export interface InputMetrics {
  totalActions: number;
  actionsPerSecond: number;
  actionCounts: Record<string, number>;
  idlePeriods: { start: number; end: number; duration: number }[];
}

export interface SceneMetrics {
  transitions: { from: string; to: string; at: number }[];
  durations: Record<string, number>;
}

export interface EntityMetrics {
  peakCount: number;
  peakByType: Record<string, number>;
  samples: number;
}

export interface PerformanceMetrics {
  averageFps: number;
  minFps: number;
  fpsDrops: { at: number; fps: number }[];
  slowFrames: number;
  fpsSamples: number[];
}

export interface TimelineEntry {
  type: 'input' | 'scene' | 'entity' | 'performance' | 'event' | 'error';
  label: string;
  at: number;
  data?: unknown;
}

export interface PlaytestReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  input: InputMetrics;
  scenes: SceneMetrics;
  entities: EntityMetrics;
  performance: PerformanceMetrics;
  events: { name: string; at: number; data?: unknown }[];
  errors: { message: string; at: number }[];
  timeline: TimelineEntry[];
}
