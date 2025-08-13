import WebSocket from "ws";
import EventEmitter from "events";
import { createWebSocket } from "../core/websocket";
import { parseMessage } from "../core/messageHandling";
import {
  ConnectionState,
  ErrorType,
  type KickClient,
  type ClientOptions,
  type Logger,
  type ConnectionOptions,
  type KickError,
} from "../types/client";
import type { MessageData } from "../types/events";

// Default no-op logger for production
const createDefaultLogger = (): Logger => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

// Console logger for debugging
const createConsoleLogger = (): Logger => ({
  debug: (message: string, ...args: any[]) => console.debug(`[KickJS DEBUG] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[KickJS INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[KickJS WARN] ${message}`, ...args),
  error: (message: string, error?: any) => console.error(`[KickJS ERROR] ${message}`, error),
});

// Resolve logger from options
const resolveLogger = (loggerOption?: Logger | boolean): Logger => {
  if (loggerOption === true) {
    return createConsoleLogger();
  } else if (loggerOption === false || loggerOption === undefined) {
    return createDefaultLogger();
  } else {
    return loggerOption;
  }
};

export const createClient = (
  channelName: string,
  options: ClientOptions = {},
): KickClient => {
  const emitter = new EventEmitter();
  let socket: WebSocket | null = null;
  let channelInfo: { id: number; name: string } | null = null;
  
  // Connection and reconnection state
  let connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  let reconnectAttempts = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let isDisconnected = false;

  // Listener tracking for proper cleanup
  const listeners = new Map<string, Set<Function>>();
  const onceListeners = new Map<string, Set<Function>>();

  // Default options
  const defaultConnectionOptions: ConnectionOptions = {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    heartbeatInterval: 30000,
  };

  const logger = resolveLogger(options.logger);

  const mergedOptions = { 
    ...options,
    logger,
    connection: { ...defaultConnectionOptions, ...options.connection }
  };

  const createError = (type: ErrorType, message: string, originalError?: Error, code?: string | number): KickError => ({
    type,
    message,
    originalError,
    code,
    context: { channelName, connectionState }
  });

  const handleError = (error: KickError) => {
    logger.error(`KickClient Error ${error.type}: ${error.message}`, error.originalError);
    if (mergedOptions.onError) {
      mergedOptions.onError(error);
    }
  };

  const setConnectionState = (newState: ConnectionState) => {
    if (connectionState !== newState) {
      connectionState = newState;
      logger.info(`Connection state changed to: ${newState}`);
      if (mergedOptions.onConnectionStateChange) {
        mergedOptions.onConnectionStateChange(newState);
      }
    }
  };

  const addListener = (event: string, listener: Function, once = false) => {
    const targetMap = once ? onceListeners : listeners;
    if (!targetMap.has(event)) {
      targetMap.set(event, new Set());
    }
    targetMap.get(event)!.add(listener);
    
    if (once) {
      const wrappedListener = (...args: any[]) => {
        removeListener(event, listener);
        (listener as any)(...args);
      };
      emitter.once(event, wrappedListener);
    } else {
      emitter.on(event, listener as any);
    }
  };

  const removeListener = (event: string, listener: Function) => {
    // Remove from tracking
    listeners.get(event)?.delete(listener);
    onceListeners.get(event)?.delete(listener);
    
    // Remove from EventEmitter
    emitter.removeListener(event, listener as any);
  };

  const removeAllListeners = (event?: string) => {
    if (event) {
      listeners.get(event)?.clear();
      onceListeners.get(event)?.clear();
      emitter.removeAllListeners(event);
    } else {
      listeners.clear();
      onceListeners.clear();
      emitter.removeAllListeners();
    }
  };

  const startHeartbeat = () => {
    if (!mergedOptions.connection?.heartbeatInterval || heartbeatTimer) {
      return;
    }

    heartbeatTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        logger.debug("Sending heartbeat ping");
        socket.ping();
      }
    }, mergedOptions.connection.heartbeatInterval);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (!mergedOptions.connection?.autoReconnect || 
        reconnectAttempts >= (mergedOptions.connection.maxReconnectAttempts || 10) ||
        isDisconnected) {
      logger.warn("Reconnection disabled or max attempts reached");
      return;
    }

    const baseInterval = mergedOptions.connection.reconnectInterval || 1000;
    const maxInterval = mergedOptions.connection.maxReconnectInterval || 30000;
    const exponentialDelay = Math.min(baseInterval * Math.pow(2, reconnectAttempts), maxInterval);
    
    logger.info(`Scheduling reconnection attempt ${reconnectAttempts + 1} in ${exponentialDelay}ms`);
    
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        await connect();
      } catch (error) {
        logger.error("Reconnection attempt failed", error);
        reconnectAttempts++;
        scheduleReconnect();
      }
    }, exponentialDelay);
  };

  const connect = async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (socket && socket.readyState === WebSocket.OPEN) {
          logger.debug("Already connected to WebSocket");
          resolve();
          return;
        }

        logger.info(`Connecting to channel: ${channelName}`);
        setConnectionState(ConnectionState.CONNECTING);

        // Get the real chatroom ID from Kick API
        const channelData = await fetch(`https://kick.com/api/v1/channels/${channelName}`);
        if (!channelData.ok) {
          throw new Error(`Failed to get channel data for ${channelName}: ${channelData.statusText}`);
        }
        
        const channelJson = await channelData.json();
        const chatroomId = channelJson.chatroom?.id;
        
        if (!chatroomId) {
          throw new Error(`No chatroom ID found for channel ${channelName}`);
        }
        
        logger.info(`Found chatroom ID ${chatroomId} for channel ${channelName}`);
        channelInfo = { id: chatroomId, name: channelName };

        socket = createWebSocket({ 
          chatroomId,
          config: mergedOptions.websocket 
        });

        socket.on("open", () => {
          if (isDisconnected) {
            logger.debug("Connection opened but client is disconnected, ignoring");
            return;
          }
          
          logger.info(`Connected to channel: ${channelName}`);
          setConnectionState(ConnectionState.CONNECTED);
          reconnectAttempts = 0;
          startHeartbeat();
          emitter.emit("ready", channelInfo);
          resolve();
        });

        socket.on("message", (data: WebSocket.Data) => {
          if (isDisconnected) return;
          
          try {
            const parsedMessage = parseMessage(data.toString(), logger);
            if (parsedMessage) {
              switch (parsedMessage.type) {
                case "ChatMessage":
                  if (mergedOptions.plainEmote) {
                    const messageData = parsedMessage.data as MessageData;
                    messageData.content = messageData.content.replace(
                      /\[emote:(\d+):(\w+)\]/g,
                      (_, __, emoteName) => emoteName,
                    );
                  }
                  emitter.emit(parsedMessage.type, parsedMessage.data);
                  break;
                  
                case "PusherConnectionEstablished":
                  logger.debug("Pusher WebSocket connection established");
                  break;
                  
                case "PusherSubscriptionSucceeded":
                  logger.debug("Successfully subscribed to chat channel");
                  break;
                  
                case "PusherPong":
                  logger.debug("Received Pusher pong");
                  break;
                  
                case "PusherPing":
                  logger.debug("Received Pusher ping");
                  break;
                  
                case "PusherError":
                  logger.error("Pusher error:", parsedMessage.data);
                  break;
                  
                default:
                  // Emit all non-Pusher events for the application to handle
                  emitter.emit(parsedMessage.type, parsedMessage.data);
                  break;
              }
            }
          } catch (error) {
            const kickError = createError(
              ErrorType.WEBSOCKET,
              "Failed to parse WebSocket message",
              error instanceof Error ? error : new Error(String(error))
            );
            handleError(kickError);
          }
        });

        socket.on("close", () => {
          stopHeartbeat();
          if (!isDisconnected) {
            logger.warn(`Connection closed for channel: ${channelName}`);
            setConnectionState(ConnectionState.DISCONNECTED);
            emitter.emit("disconnect");
            scheduleReconnect();
          }
        });

        socket.on("error", (error) => {
          stopHeartbeat();
          setConnectionState(ConnectionState.ERROR);
          const kickError = createError(
            ErrorType.WEBSOCKET,
            "WebSocket connection error",
            error instanceof Error ? error : new Error(String(error))
          );
          handleError(kickError);
          emitter.emit("error", kickError);
          reject(kickError);
        });

        socket.on("pong", () => {
          logger.debug("Received heartbeat pong");
        });

      } catch (error) {
        setConnectionState(ConnectionState.ERROR);
        const kickError = createError(
          ErrorType.CONNECTION,
          "Failed to create WebSocket connection",
          error instanceof Error ? error : new Error(String(error))
        );
        handleError(kickError);
        reject(kickError);
      }
    });
  };

  const disconnect = () => {
    logger.info("Disconnecting client...");
    isDisconnected = true;
    setConnectionState(ConnectionState.DISCONNECTED);
    
    // Stop reconnection attempts
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Close WebSocket
    if (socket) {
      socket.removeAllListeners();
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      socket = null;
    }
    
    // Clear all event emitter listeners
    removeAllListeners();
    
    // Reset client state
    channelInfo = null;
    reconnectAttempts = 0;
    
    logger.info("Client disconnected and cleaned up");
  };

  const isConnected = (): boolean => {
    return socket !== null && socket.readyState === WebSocket.OPEN;
  };

  const getConnectionState = (): ConnectionState => {
    return connectionState;
  };

  const getChannel = (): { id: number; name: string } | null => {
    return channelInfo;
  };

  // Public API
  const client: KickClient = {
    on: (event: string, listener: (...args: any[]) => void) => {
      addListener(event, listener, false);
    },
    
    off: (event: string, listener: (...args: any[]) => void) => {
      removeListener(event, listener);
    },
    
    removeListener: (event: string, listener: (...args: any[]) => void) => {
      removeListener(event, listener);
    },
    
    once: (event: string, listener: (...args: any[]) => void) => {
      addListener(event, listener, true);
    },
    
    removeAllListeners,
    connect,
    
    // Backward compatibility method
    start: async () => {
      logger.warn("start() is deprecated, use connect() instead");
      return connect();
    },
    
    disconnect,
    isConnected,
    getConnectionState,
    getChannel,
  };

  // Backward compatibility: auto-connect if readOnly is true
  if (options.readOnly === true) {
    logger.info("Auto-connecting due to readOnly: true (deprecated)");
    void connect().catch((error) => {
      logger.error("Auto-connect failed:", error);
    });
  }

  return client;
};