import { ConsoleReporter } from '../debug/ConsoleReporter';
import type {
  ConnectionState,
  NetworkConfig,
  ServerMessage,
  ConnectedData,
} from './protocol';

type MessageHandler = (type: string, data: unknown) => void;
type StateHandler = (state: ConnectionState) => void;

/**
 * WebSocket client with auto-reconnect, heartbeat keepalive,
 * and typed message dispatch. Matches clik-server protocol.
 */
export class NetworkManager {
  private ws: WebSocket | null = null;
  private config: Required<NetworkConfig>;
  private state: ConnectionState = 'disconnected';
  private playerId: string | null = null;
  private retryCount = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private messageHandlers: MessageHandler[] = [];
  private stateHandlers: StateHandler[] = [];

  constructor(config: NetworkConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      heartbeatInterval: config.heartbeatInterval ?? 5000,
      maxRetries: config.maxRetries ?? 10,
      reconnectBaseDelay: config.reconnectBaseDelay ?? 1000,
    };
  }

  /** Connect to the server */
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') return;

    this.setState(this.retryCount > 0 ? 'reconnecting' : 'connecting');
    ConsoleReporter.engine(`Network: connecting to ${this.config.url}`);

    try {
      this.ws = new WebSocket(this.config.url);
    } catch (err) {
      ConsoleReporter.error(`Network: failed to create WebSocket: ${err}`);
      this.handleDisconnect();
      return;
    }

    this.ws.onopen = () => {
      ConsoleReporter.engine('Network: connected');
      this.retryCount = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data as string);
        this.handleServerMessage(msg.type, msg.data);
      } catch {
        ConsoleReporter.error('Network: failed to parse message');
      }
    };

    this.ws.onclose = () => {
      ConsoleReporter.engine('Network: disconnected');
      this.stopHeartbeat();
      this.handleDisconnect();
    };

    this.ws.onerror = () => {
      ConsoleReporter.error('Network: WebSocket error');
    };
  }

  /** Disconnect from the server */
  disconnect(): void {
    this.config.autoReconnect = false;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
    this.playerId = null;
  }

  /** Send a typed message to the server */
  send(type: string, data?: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      ConsoleReporter.error(`Network: cannot send '${type}' — not connected`, 'Call network.connect() first and wait for the connected state.');
      return;
    }
    this.ws.send(JSON.stringify({ type, data: data ?? {} }));
  }

  /** Register a handler for server messages */
  onMessage(handler: MessageHandler): this {
    this.messageHandlers.push(handler);
    return this;
  }

  /** Remove a message handler */
  offMessage(handler: MessageHandler): this {
    const idx = this.messageHandlers.indexOf(handler);
    if (idx >= 0) this.messageHandlers.splice(idx, 1);
    return this;
  }

  /** Register a handler for connection state changes */
  onStateChange(handler: StateHandler): this {
    this.stateHandlers.push(handler);
    return this;
  }

  /** Remove a state change handler */
  offStateChange(handler: StateHandler): this {
    const idx = this.stateHandlers.indexOf(handler);
    if (idx >= 0) this.stateHandlers.splice(idx, 1);
    return this;
  }

  /** Get current connection state */
  getState(): ConnectionState {
    return this.state;
  }

  /** Get the player ID assigned by the server */
  getPlayerId(): string | null {
    return this.playerId;
  }

  /** Check if connected */
  get isConnected(): boolean {
    return this.state === 'connected';
  }

  /** Clean up all resources */
  destroy(): void {
    this.disconnect();
    this.messageHandlers.length = 0;
    this.stateHandlers.length = 0;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private handleServerMessage(type: string, data: unknown): void {
    // Handle connection confirmation
    if (type === 'connected') {
      const d = data as ConnectedData;
      this.playerId = d.playerId;
      this.setState('connected');
      ConsoleReporter.engine(`Network: assigned playerId = ${this.playerId}`);
    }

    // Dispatch to all handlers
    for (const handler of this.messageHandlers) {
      handler(type, data);
    }
  }

  private handleDisconnect(): void {
    this.ws = null;
    if (this.state === 'disconnected') return;

    if (this.config.autoReconnect && this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      const delay = Math.min(
        this.config.reconnectBaseDelay * Math.pow(2, this.retryCount - 1),
        30000
      );
      ConsoleReporter.engine(`Network: reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);
      this.setState('reconnecting');
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    } else {
      this.setState('disconnected');
      if (this.retryCount >= this.config.maxRetries) {
        ConsoleReporter.error('Network: max reconnection attempts reached', 'Check server availability or increase maxRetries in NetworkConfig.');
      }
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    for (const handler of this.stateHandlers) {
      handler(state);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
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

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
