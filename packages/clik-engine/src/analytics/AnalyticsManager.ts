import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type AnalyticsBackend = (event: AnalyticsEvent) => void;

export class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private backends: AnalyticsBackend[] = [];
  private enabled = true;
  private sessionStart: number;
  private sessionId: string;

  constructor() {
    this.sessionStart = Date.now();
    this.sessionId = Math.random().toString(36).substring(2, 10);
  }

  /** Add a backend to send events to (console, API endpoint, Firebase, etc.) */
  addBackend(backend: AnalyticsBackend): this {
    this.backends.push(backend);
    return this;
  }

  /** Use the built-in console backend (logs events to console) */
  useConsoleBackend(): this {
    this.addBackend((event) => {
      ConsoleReporter.engine(`analytics: ${event.name}`, event.data);
    });
    return this;
  }

  /** Track a custom event */
  track(name: string, data?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);
    for (const backend of this.backends) {
      try {
        backend(event);
      } catch {
        // Don't let analytics errors break the game
      }
    }
  }

  /** Track a scene view */
  trackSceneView(sceneKey: string): void {
    this.track('scene_view', { scene: sceneKey });
  }

  /** Track a button click */
  trackClick(elementName: string): void {
    this.track('click', { element: elementName });
  }

  /** Track a game event (level complete, game over, etc.) */
  trackGameEvent(event: string, data?: Record<string, unknown>): void {
    this.track(`game_${event}`, data);
  }

  /** Get session duration in seconds */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStart) / 1000);
  }

  /** Get session ID */
  getSessionId(): string {
    return this.sessionId;
  }

  /** Get all tracked events */
  getEvents(): readonly AnalyticsEvent[] {
    return this.events;
  }

  /** Get event count by name */
  getEventCount(name: string): number {
    return this.events.filter(e => e.name === name).length;
  }

  /** Enable/disable tracking */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    ConsoleReporter.engine(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /** Clear all tracked events */
  clear(): void {
    this.events = [];
  }
}
