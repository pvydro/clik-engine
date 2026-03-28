import { ConsoleReporter } from './ConsoleReporter';

const HOT_STATE_KEY = '__clik_hot_state__';

export interface HotStateConfig {
  /** Functions that serialize scene state before reload */
  serialize: () => Record<string, unknown>;
  /** Function that restores state after reload */
  restore: (state: Record<string, unknown>) => void;
}

/**
 * Preserves game state across Vite HMR reloads.
 * Saves to sessionStorage before unload, restores on next boot.
 */
export const HotState = {
  /** Save state before HMR reload */
  save(sceneKey: string, data: Record<string, unknown>): void {
    try {
      const existing = HotState.loadAll();
      existing[sceneKey] = { data, timestamp: Date.now() };
      sessionStorage.setItem(HOT_STATE_KEY, JSON.stringify(existing));
      ConsoleReporter.engine(`HotState saved: ${sceneKey}`, Object.keys(data));
    } catch {
      // sessionStorage may be unavailable
    }
  },

  /** Load state for a specific scene after reload */
  load(sceneKey: string): Record<string, unknown> | null {
    try {
      const all = HotState.loadAll();
      const entry = all[sceneKey];
      if (!entry) return null;

      // Expire after 30 seconds (stale hot state)
      if (Date.now() - entry.timestamp > 30000) {
        delete all[sceneKey];
        sessionStorage.setItem(HOT_STATE_KEY, JSON.stringify(all));
        return null;
      }

      ConsoleReporter.engine(`HotState restored: ${sceneKey}`, Object.keys(entry.data));
      return entry.data;
    } catch {
      return null;
    }
  },

  /** Load all saved states */
  loadAll(): Record<string, { data: Record<string, unknown>; timestamp: number }> {
    try {
      const raw = sessionStorage.getItem(HOT_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /** Clear all hot state */
  clear(): void {
    try {
      sessionStorage.removeItem(HOT_STATE_KEY);
    } catch {
      // ignore
    }
  },

  /** Clear hot state for a specific scene */
  clearScene(sceneKey: string): void {
    try {
      const all = HotState.loadAll();
      delete all[sceneKey];
      sessionStorage.setItem(HOT_STATE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
  },

  /**
   * Setup auto-save before page unload (HMR triggers beforeunload).
   * Call this in scene create() with a serializer function.
   */
  autoSave(sceneKey: string, serialize: () => Record<string, unknown>): void {
    const handler = () => {
      HotState.save(sceneKey, serialize());
    };
    window.addEventListener('beforeunload', handler);

    // Also hook into Vite HMR if available
    const meta = import.meta as unknown as { hot?: { dispose: (cb: () => void) => void } };
    if (meta.hot) {
      meta.hot.dispose(() => {
        HotState.save(sceneKey, serialize());
      });
    }
  },
};
