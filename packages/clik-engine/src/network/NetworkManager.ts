import { ConsoleReporter } from '../debug/ConsoleReporter';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface NetworkConfig {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type MessageHandler = (data: unknown) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private config: NetworkConfig;
  private state: ConnectionState = 'disconnected';
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stateListeners: ((state: ConnectionState) => void)[] = [];

  constructor(config: NetworkConfig) {
    this.config = {
      reconnect: true,
      reconnectDelay: 2000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') return;

    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
    ConsoleReporter.engine(`Network: connecting to ${this.config.url}`);

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        ConsoleReporter.engine('Network: connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type && this.handlers.has(msg.type)) {
            for (const handler of this.handlers.get(msg.type)!) {
              handler(msg.data);
            }
          }
        } catch {
          ConsoleReporter.error('Network: failed to parse message');
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setState('disconnected');
        ConsoleReporter.engine('Network: disconnected');
        this.tryReconnect();
      };

      this.ws.onerror = () => {
        ConsoleReporter.error('Network: connection error');
      };
    } catch (e) {
      ConsoleReporter.error(`Network: failed to connect — ${e}`);
      this.setState('disconnected');
      this.tryReconnect();
    }
  }

  disconnect(): void {
    this.config.reconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setState('disconnected');
  }

  send(type: string, data?: unknown): void {
    if (this.state !== 'connected' || !this.ws) {
      ConsoleReporter.error('Network: cannot send — not connected');
      return;
    }
    this.ws.send(JSON.stringify({ type, data }));
  }

  on(type: string, handler: MessageHandler): this {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    return this;
  }

  off(type: string, handler: MessageHandler): this {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    return this;
  }

  onStateChange(listener: (state: ConnectionState) => void): this {
    this.stateListeners.push(listener);
    return this;
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private tryReconnect(): void {
    if (!this.config.reconnect) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      ConsoleReporter.error('Network: max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay! * Math.pow(1.5, this.reconnectAttempts - 1);
    ConsoleReporter.engine(`Network: reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval) return;
    this.heartbeatTimer = setInterval(() => {
      this.send('__heartbeat');
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
