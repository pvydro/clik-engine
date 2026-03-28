export enum ClikLogChannel {
  SCENE = 'CLIK:SCENE',
  STATE = 'CLIK:STATE',
  INPUT = 'CLIK:INPUT',
  ERROR = 'CLIK:ERROR',
  ASSET = 'CLIK:ASSET',
  AUDIO = 'CLIK:AUDIO',
  SAVE  = 'CLIK:SAVE',
  ENGINE = 'CLIK:ENGINE',
}

let enabled = true;

export const ConsoleReporter = {
  enable(): void {
    enabled = true;
  },

  disable(): void {
    enabled = false;
  },

  log(channel: ClikLogChannel, message: string, data?: unknown): void {
    if (!enabled) return;
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
    const prefix = `[${ClikLogChannel.ERROR}]`;
    console.error(prefix, message);
    if (suggestion) {
      console.error(prefix, `Suggestion: ${suggestion}`);
    }
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
};
