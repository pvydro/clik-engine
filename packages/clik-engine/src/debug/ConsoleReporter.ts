export enum ClikLogChannel {
  SCENE = 'CLIK:SCENE',
  STATE = 'CLIK:STATE',
  INPUT = 'CLIK:INPUT',
  ERROR = 'CLIK:ERROR',
  ASSET = 'CLIK:ASSET',
  AUDIO = 'CLIK:AUDIO',
  SAVE  = 'CLIK:SAVE',
  ENGINE = 'CLIK:ENGINE',
  CONSOLE = 'CLIK:CONSOLE',
  PLAYTEST = 'CLIK:PLAYTEST',
  HARNESS = 'CLIK:HARNESS',
}

export type ErrorListener = (message: string, suggestion?: string) => void;

let enabled = true;
const disabledChannels = new Set<ClikLogChannel>();
const errorListeners = new Set<ErrorListener>();

export const ConsoleReporter = {
  enable(): void {
    enabled = true;
  },

  disable(): void {
    enabled = false;
  },

  enableChannel(channel: ClikLogChannel): void {
    disabledChannels.delete(channel);
  },

  disableChannel(channel: ClikLogChannel): void {
    disabledChannels.add(channel);
  },

  setChannels(channels: ClikLogChannel[], enabledState: boolean): void {
    for (const ch of channels) {
      if (enabledState) {
        disabledChannels.delete(ch);
      } else {
        disabledChannels.add(ch);
      }
    }
  },

  isChannelEnabled(channel: ClikLogChannel): boolean {
    return enabled && !disabledChannels.has(channel);
  },

  log(channel: ClikLogChannel, message: string, data?: unknown): void {
    if (!enabled || disabledChannels.has(channel)) return;
    const prefix = `[${channel}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  },

  scene(message: string, data?: unknown): void {
    this.log(ClikLogChannel.SCENE, message, data);
  },

  state(message: string, data?: unknown): void {
    this.log(ClikLogChannel.STATE, message, data);
  },

  input(message: string, data?: unknown): void {
    this.log(ClikLogChannel.INPUT, message, data);
  },

  error(message: string, suggestion?: string): void {
    // Errors always log regardless of channel filter
    const prefix = `[${ClikLogChannel.ERROR}]`;
    console.error(prefix, message);
    if (suggestion) {
      console.error(prefix, `Suggestion: ${suggestion}`);
    }
    // Notify error listeners (used by PlaytestReporter, DebugConsole, etc.)
    for (const listener of errorListeners) {
      try { listener(message, suggestion); } catch { /* isolate listener errors */ }
    }
  },

  addErrorListener(listener: ErrorListener): void {
    errorListeners.add(listener);
  },

  removeErrorListener(listener: ErrorListener): void {
    errorListeners.delete(listener);
  },

  asset(message: string, data?: unknown): void {
    this.log(ClikLogChannel.ASSET, message, data);
  },

  audio(message: string, data?: unknown): void {
    this.log(ClikLogChannel.AUDIO, message, data);
  },

  save(message: string, data?: unknown): void {
    this.log(ClikLogChannel.SAVE, message, data);
  },

  engine(message: string, data?: unknown): void {
    this.log(ClikLogChannel.ENGINE, message, data);
  },

  console(message: string, data?: unknown): void {
    this.log(ClikLogChannel.CONSOLE, message, data);
  },

  playtest(message: string, data?: unknown): void {
    this.log(ClikLogChannel.PLAYTEST, message, data);
  },

  harness(message: string, data?: unknown): void {
    this.log(ClikLogChannel.HARNESS, message, data);
  },
};
