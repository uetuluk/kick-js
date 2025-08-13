![Version](https://img.shields.io/npm/v/@retconned/kick-js?label=Version)
![License](https://img.shields.io/npm/l/@retconned/kick-js?label=License)

❇️ **@retconned/kick-js**

## **What is kick-js**

**kick-js** is a TypeScript-based library for [kick.com](https://kick.com)'s chat system. It provides a simple interface that allows developers to build chat bots and other chat-related applications.

### :construction: This library is still active for now as a selfbot library for Kick, but it will be fully updated to match their official documentation once they implement WebSocket support for messages. :construction:

## Features :rocket:

-   ✅ **Chat Integration**: Read & write to Kick.com chat in real-time
-   ✅ **Moderation Actions**: Ban users, manage slow mode, delete messages
-   ✅ **Client Management**: Proper connection lifecycle with disconnect/cleanup
-   ✅ **Error Handling**: Comprehensive error system with typed error handling
-   ✅ **WebSocket Configuration**: Customizable WebSocket URLs and headers
-   ✅ **Connection State Tracking**: Monitor connection status in real-time
-   ✅ **TypeScript Support**: Full TypeScript with enhanced type definitions
-   ✅ **Resource Management**: Automatic cleanup and memory leak prevention

## Installation :package:

Install the @retconned/kick-js package using the following command:

```sh
npm install @retconned/kick-js
```

## Basic Usage :computer:

```ts
import { createClient, ConnectionState, ErrorType, type KickError } from "@retconned/kick-js";
import "dotenv/config";

// Create client with enhanced configuration
const client = createClient("xqc", { 
  logger: true, 
  readOnly: false,
  // Enhanced error handling
  onError: (error: KickError) => {
    console.error(`❌ ${error.type}: ${error.message}`);
  },
  // Connection state monitoring
  onConnectionStateChange: (state: ConnectionState) => {
    console.log(`🔄 Connection: ${state}`);
  }
});

// Authentication with login credentials
client.login({
  type: "login",
  credentials: {
    username: "your-username",
    password: "your-password",
    otp_secret: "your-2fa-secret", // Get from https://kick.com/settings/security
  },
});

// Or authenticate with tokens from browser
client.login({
  type: "tokens",
  credentials: {
    bearerToken: process.env.BEARER_TOKEN!,
    xsrfToken: process.env.XSRF_TOKEN!,
    cookies: process.env.COOKIES!,
  },
});

client.on("ready", () => {
  console.log(`Bot ready & logged into ${client.user?.tag}!`);
  console.log(`Connection state: ${client.getConnectionState()}`);
});

client.on("ChatMessage", async (message) => {
  console.log(`${message.sender.username}: ${message.content}`);
  
  // Bot commands
  if (message.content === "!ping") {
    await client.sendMessage("Pong! 🏓");
  }
  
  if (message.content === "!disconnect") {
    client.disconnect(); // Proper cleanup
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.disconnect();
  process.exit(0);
});
```

## Advanced Configuration :gear:

### Custom WebSocket Configuration

```ts
const client = createClient("channel-name", {
  websocket: {
    // Custom Pusher WebSocket URL
    pusherUrl: "wss://custom-websocket-url.com/app/12345",
    
    // Custom WebSocket headers
    headers: {
      "User-Agent": "MyBot/1.0",
      "Custom-Header": "custom-value"
    },
    
    // WebSocket options
    wsOptions: {
      handshakeTimeout: 10000,
      // Remove default WebSocket headers if needed
    }
  }
});
```

### Comprehensive Error Handling

```ts
client.on("error", (error: KickError) => {
  switch (error.type) {
    case ErrorType.CONNECTION:
      console.log("Connection lost - implement reconnection logic");
      break;
    case ErrorType.AUTHENTICATION:
      console.log("Auth failed - check credentials");
      break;
    case ErrorType.WEBSOCKET:
      console.log("WebSocket error occurred");
      break;
    case ErrorType.API_REQUEST:
      console.log("API request failed");
      break;
    case ErrorType.VALIDATION:
      console.log("Input validation error");
      break;
  }
});
```

## API Reference :book:

### Client Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `client.disconnect()` | Properly disconnect and cleanup | `void` |
| `client.getConnectionState()` | Get current connection state | `ConnectionState` |
| `client.sendMessage(content)` | Send message to chat | `Promise<void>` |
| `client.banUser(user, duration?)` | Ban or timeout user | `Promise<void>` |
| `client.slowMode(mode, duration?)` | Toggle slow mode | `Promise<void>` |
| `client.vod(videoId)` | Get VOD information | `Promise<Video>` |
| `client.getPoll(channel?)` | Get current poll | `Promise<Poll>` |
| `client.getLeaderboards(channel?)` | Get leaderboards | `Promise<Leaderboard>` |

### Connection States

- `ConnectionState.DISCONNECTED` - Not connected
- `ConnectionState.CONNECTING` - Establishing connection  
- `ConnectionState.CONNECTED` - Successfully connected
- `ConnectionState.RECONNECTING` - Attempting to reconnect
- `ConnectionState.ERROR` - Connection error occurred

### Error Types

- `ErrorType.CONNECTION` - Connection-related errors
- `ErrorType.AUTHENTICATION` - Authentication failures
- `ErrorType.WEBSOCKET` - WebSocket errors
- `ErrorType.API_REQUEST` - API request failures  
- `ErrorType.VALIDATION` - Input validation errors

## Disclaimer :warning:

@retconned/kick-js is not affiliated with or endorsed by [Kick.com](https://kick.com). It is an independent tool created to facilitate making moderation bots & other chat-related applications.
