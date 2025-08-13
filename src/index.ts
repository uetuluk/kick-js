import { createClient } from "./client/client";
import { createWebSocket } from "./core/websocket";
import { parseMessage } from "./core/messageHandling";
import { 
  ConnectionState,
  ErrorType,
  type KickClient,
  type ClientOptions,
  type WebSocketConfig,
  type Logger,
  type ConnectionOptions,
  type KickError,
  type EventHandler,
} from "./types/client";

// Export main functions
export { createClient, ConnectionState, ErrorType };

// Export utility functions
export { createWebSocket, parseMessage };

// Export all types for parent application use
export type { 
  KickClient,
  ClientOptions,
  WebSocketConfig,
  Logger,
  ConnectionOptions,
  KickError,
  EventHandler,
};

// Re-export event types from events module
export type {
  MessageData,
  ChatMessage,
  Subscription,
  GiftedSubscriptionsEvent,
  StreamHostEvent,
  UserBannedEvent,
  UserUnbannedEvent,
  PinnedMessageCreatedEvent,
  MessageDeletedEvent,
  MessageEvent,
} from "./types/events";
