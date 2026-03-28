import type { ActionBinding, InputConfig } from '../utils/types';

export class ActionMap {
  private actions: Map<string, ActionBinding> = new Map();

  constructor(config?: InputConfig) {
    if (config) {
      for (const [name, binding] of Object.entries(config.actions)) {
        this.actions.set(name, binding);
      }
    }
  }

  get(action: string): ActionBinding | undefined {
    return this.actions.get(action);
  }

  getKeys(action: string): string[] {
    return this.actions.get(action)?.keys ?? [];
  }

  getTouch(action: string): string | undefined {
    return this.actions.get(action)?.touch;
  }

  getGamepad(action: string): string | undefined {
    return this.actions.get(action)?.gamepad;
  }

  has(action: string): boolean {
    return this.actions.has(action);
  }

  allActions(): string[] {
    return Array.from(this.actions.keys());
  }

  /** Rebind an action at runtime */
  rebind(action: string, binding: Partial<ActionBinding>): void {
    const existing = this.actions.get(action) ?? {};
    this.actions.set(action, { ...existing, ...binding });
  }

  /** Register a new action */
  register(action: string, binding: ActionBinding): void {
    this.actions.set(action, binding);
  }

  /** Remove an action */
  unregister(action: string): void {
    this.actions.delete(action);
  }
}
