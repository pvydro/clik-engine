import { ConsoleReporter } from '../debug/ConsoleReporter';

type EventCallback = (...args: unknown[]) => void;

/**
 * Global event bus for decoupled communication between game systems.
 * Scenes, entities, and managers can emit/listen without direct references.
 *
 * Common events:
 * - 'player:death', 'player:respawn'
 * - 'score:changed', 'level:complete'
 * - 'enemy:killed', 'item:collected'
 * - 'ui:pause', 'ui:resume'
 */
export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();
  private onceListeners: Map<string, EventCallback[]> = new Map();

  /** Listen for an event */
  on(event: string, callback: EventCallback): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return this;
  }

  /** Listen for an event once */
  once(event: string, callback: EventCallback): this {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    this.onceListeners.get(event)!.push(callback);
    return this;
  }

  /** Remove a listener */
  off(event: string, callback: EventCallback): this {
    const cbs = this.listeners.get(event);
    if (cbs) {
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    }
    return this;
  }

  /** Emit an event to all listeners */
  emit(event: string, ...args: unknown[]): this {
    // Regular listeners
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of [...cbs]) cb(...args);
    }

    // Once listeners
    const onceCbs = this.onceListeners.get(event);
    if (onceCbs) {
      for (const cb of onceCbs) cb(...args);
      this.onceListeners.delete(event);
    }

    return this;
  }

  /** Remove all listeners for an event */
  removeAll(event: string): this {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
    return this;
  }

  /** Remove all listeners for all events */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /** Check if an event has listeners */
  hasListeners(event: string): boolean {
    return (this.listeners.get(event)?.length ?? 0) > 0 ||
           (this.onceListeners.get(event)?.length ?? 0) > 0;
  }

  /** Get count of listeners for an event */
  listenerCount(event: string): number {
    return (this.listeners.get(event)?.length ?? 0) +
           (this.onceListeners.get(event)?.length ?? 0);
  }
}

/** Global game event bus singleton */
export const eventBus = new EventBus();
