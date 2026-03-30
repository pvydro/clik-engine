import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { SaveConfig } from '../utils/types';

interface SaveData {
  version: number;
  slot: number;
  timestamp: number;
  data: Record<string, unknown>;
}

export class SaveManager {
  private prefix: string;
  private maxSlots: number;
  private version: number;

  constructor(gameName: string, config?: SaveConfig) {
    this.prefix = `clik_${gameName}`;
    this.maxSlots = config?.slots ?? 3;
    this.version = config?.version ?? 1;
  }

  save(slot: number, data: Record<string, unknown>): boolean {
    if (slot < 0 || slot >= this.maxSlots) {
      ConsoleReporter.error(`Save slot ${slot} out of range (0-${this.maxSlots - 1})`);
      return false;
    }

    const saveData: SaveData = {
      version: this.version,
      slot,
      timestamp: Date.now(),
      data,
    };

    try {
      localStorage.setItem(this.key(slot), JSON.stringify(saveData));
      ConsoleReporter.save(`Saved to slot ${slot}`, { version: this.version, keys: Object.keys(data) });
      return true;
    } catch (e) {
      ConsoleReporter.error(`Failed to save slot ${slot}: ${e}`);
      return false;
    }
  }

  load(slot: number): Record<string, unknown> | null {
    if (slot < 0 || slot >= this.maxSlots) {
      ConsoleReporter.error(`Load slot ${slot} out of range (0-${this.maxSlots - 1})`);
      return null;
    }

    try {
      const raw = localStorage.getItem(this.key(slot));
      if (!raw) return null;

      const saveData: SaveData = JSON.parse(raw);
      ConsoleReporter.save(`Loaded slot ${slot}`, { version: saveData.version, timestamp: new Date(saveData.timestamp).toISOString() });
      return saveData.data;
    } catch (e) {
      ConsoleReporter.error(`Failed to load slot ${slot}: ${e}`);
      return null;
    }
  }

  delete(slot: number): void {
    localStorage.removeItem(this.key(slot));
    ConsoleReporter.save(`Deleted slot ${slot}`);
  }

  listSlots(): { slot: number; timestamp: number; version: number }[] {
    const slots = [];
    for (let i = 0; i < this.maxSlots; i++) {
      const raw = localStorage.getItem(this.key(i));
      if (raw) {
        try {
          const data: SaveData = JSON.parse(raw);
          slots.push({ slot: i, timestamp: data.timestamp, version: data.version });
        } catch {
          ConsoleReporter.error(`Corrupt save in slot ${i} — skipping`, 'Use delete(slot) to clear it');
        }
      }
    }
    return slots;
  }

  hasSave(slot: number): boolean {
    return localStorage.getItem(this.key(slot)) !== null;
  }

  private key(slot: number): string {
    return `${this.prefix}_slot_${slot}`;
  }
}
