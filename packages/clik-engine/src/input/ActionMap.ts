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

  has(action: string): boolean {
    return this.actions.has(action);
  }

  allActions(): string[] {
    return Array.from(this.actions.keys());
  }
}
