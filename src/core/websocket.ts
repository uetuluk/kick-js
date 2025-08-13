import WebSocket from "ws";
import { URLSearchParams } from "url";
import type { WebSocketConfig } from "../types/client";

const DEFAULT_BASE_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679";
const DEFAULT_PUSHER_APP_KEY = "32cbd69e4b950bf97679";

interface CreateWebSocketOptions {
  chatroomId: number;
  config?: WebSocketConfig;
}

/**
 * Create a WebSocket connection to Kick's chat system
 * @param options Configuration options for the WebSocket connection
 * @returns WebSocket instance configured for Kick chat with heartbeat support
 */
export const createWebSocket = ({ chatroomId, config = {} }: CreateWebSocketOptions): WebSocket => {
  const {
    pusherUrl = DEFAULT_BASE_URL,
    pusherAppKey,
    protocol = "7",
    client = "js",
    version = "7.4.0",
    flash = "false",
    wsOptions = {},
    headers = {}
  } = config;

  // Extract app key from URL if not provided
  let appKey = pusherAppKey;
  if (!appKey) {
    const urlMatch = pusherUrl.match(/\/app\/([^?]+)/);
    appKey = urlMatch ? urlMatch[1] : DEFAULT_PUSHER_APP_KEY;
  }

  // Build the base URL with the app key
  let baseUrl = pusherUrl;
  if (!pusherUrl.includes('/app/')) {
    baseUrl = `${pusherUrl.replace(/\/$/, '')}/app/${appKey}`;
  }

  const urlParams = new URLSearchParams({
    protocol,
    client,
    version,
    flash,
  });
  
  const url = `${baseUrl}?${urlParams.toString()}`;

  // Merge custom headers with WebSocket options
  const socketOptions: WebSocket.ClientOptions = {
    ...wsOptions,
    headers: {
      ...wsOptions.headers,
      ...headers
    }
  };

  const socket = new WebSocket(url, socketOptions);

  // Set up heartbeat support
  socket.on("open", () => {
    const connect = JSON.stringify({
      event: "pusher:subscribe",
      data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
    });
    socket.send(connect);
  });

  // Handle ping frames for heartbeat
  socket.on("ping", (data) => {
    socket.pong(data);
  });

  return socket;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use createWebSocket with options object instead
 */
export const createWebSocketLegacy = (chatroomId: number): WebSocket => {
  return createWebSocket({ chatroomId });
};
