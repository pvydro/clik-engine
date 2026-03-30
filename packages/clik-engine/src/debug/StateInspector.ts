import Phaser from 'phaser';
import { ConsoleReporter } from './ConsoleReporter';

interface InspectedState {
  label: string;
  getter: () => Record<string, unknown>;
}

export class StateInspector extends Phaser.Scene {
  private stateText!: Phaser.GameObjects.Text;
  private registrations: InspectedState[] = [];
  private frameCount = 0;
  private static readonly UPDATE_INTERVAL = 6;

  private static readonly STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#ffcc00',
    backgroundColor: '#000000aa',
    padding: { x: 4, y: 2 },
    align: 'right',
  };

  constructor() {
    super({ key: '__clik_state_inspector' });
  }

  create(): void {
    const { width } = this.scale;
    this.stateText = this.add.text(width - 8, 8, '', StateInspector.STYLE)
      .setOrigin(1, 0)
      .setDepth(9999);

    ConsoleReporter.engine('StateInspector active');
  }

  inspect(label: string, getter: () => Record<string, unknown>): void {
    const existing = this.registrations.findIndex(r => r.label === label);
    if (existing >= 0) {
      this.registrations[existing].getter = getter;
    } else {
      this.registrations.push({ label, getter });
    }
  }

  uninspect(label: string): void {
    this.registrations = this.registrations.filter(r => r.label !== label);
  }

  update(): void {
    this.frameCount++;
    if (this.frameCount % StateInspector.UPDATE_INTERVAL !== 0) return;

    if (this.registrations.length === 0) {
      this.stateText.setText('');
      return;
    }

    const lines: string[] = [];
    for (const reg of this.registrations) {
      try {
        const data = reg.getter();
        lines.push(`[${reg.label}]`);
        for (const [key, value] of Object.entries(data)) {
          lines.push(`  ${key}: ${this.formatValue(value)}`);
        }
      } catch {
        lines.push(`[${reg.label}] ERROR`);
      }
    }
    this.stateText.setText(lines.join('\n'));
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null || value === undefined) return 'null';
    return String(value);
  }
}
