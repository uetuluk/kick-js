import type WebSocket from "ws";

export type EventHandler<T> = (data: T) => void;

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, error?: any) => void;
}

export interface ConnectionOptions {
  /** Enable automatic reconnection on disconnect */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base reconnection interval in ms (default: 1000) */
  reconnectInterval?: number;
  /** Maximum reconnection interval in ms (default: 30000) */
  maxReconnectInterval?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface WebSocketConfig {
  /** Custom Pusher WebSocket URL (defaults to wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679) */
  pusherUrl?: string;
  /** Pusher app key (extracted from URL if not provided) */
  pusherAppKey?: string;
  /** Protocol version (defaults to "7") */
  protocol?: string;
  /** Client identifier (defaults to "js") */
  client?: string;
  /** Client version (defaults to "7.4.0") */
  version?: string;
  /** Flash support (defaults to "false") */
  flash?: string;
  /** Custom WebSocket options passed to ws constructor */
  wsOptions?: WebSocket.ClientOptions;
  /** Custom headers for WebSocket handshake */
  headers?: Record<string, string>;
}

export interface ClientOptions {
  plainEmote?: boolean;
  /** Logger instance for debugging and monitoring, or boolean for console logger */
  logger?: Logger | boolean;
  /** @deprecated No longer used - kept for backward compatibility */
  readOnly?: boolean;
  /** WebSocket configuration options */
  websocket?: WebSocketConfig;
  /** Connection and reconnection options */
  connection?: ConnectionOptions;
  /** Error handler for connection and WebSocket errors */
  onError?: (error: KickError) => void;
  /** Connection state change handler */
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export interface KickClient {
  /** Add event listener */
  on: (event: string, listener: (...args: any[]) => void) => void;
  /** Remove specific event listener */
  off: (event: string, listener: (...args: any[]) => void) => void;
  /** Remove specific event listener (alias for off) */
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
  /** Add one-time event listener */
  once: (event: string, listener: (...args: any[]) => void) => void;
  /** Remove all listeners for an event (or all events if no event specified) */
  removeAllListeners: (event?: string) => void;
  /** Connect to the chat WebSocket */
  connect: () => Promise<void>;
  /** @deprecated Use connect() instead */
  start?: () => Promise<void>;
  /** Disconnect and cleanup the client */
  disconnect: () => void;
  /** Check if currently connected to chat */
  isConnected: () => boolean;
  /** Get current connection state */
  getConnectionState: () => ConnectionState;
  /** Get channel info from WebSocket connection */
  getChannel: () => { id: number; name: string; } | null;
}

export enum ErrorType {
  CONNECTION = 'connection',
  WEBSOCKET = 'websocket',
  VALIDATION = 'validation'
}

export interface KickError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  code?: string | number;
  context?: Record<string, unknown>;
}
