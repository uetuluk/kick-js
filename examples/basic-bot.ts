import { createClient, ConnectionState, ErrorType, type MessageData, type KickError, type Logger } from "@retconned/kick-js";

// Create a custom logger (or use console for debugging)
const logger: Logger = {
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error),
};

// Create WebSocket-only client with enhanced configuration
const client = createClient("xqc", { 
  logger, // Pass custom logger
  plainEmote: true, // Convert emotes to text
  // WebSocket configuration
  websocket: {
    headers: {
      "User-Agent": "KickJS-Enhanced-Bot/1.0"
    }
  },
  // Connection options
  connection: {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 1000,
    heartbeatInterval: 30000
  },
  // Error handler for all errors
  onError: (error: KickError) => {
    console.error(`❌ ${error.type}: ${error.message}`);
    if (error.originalError) {
      console.error("Original error:", error.originalError);
    }
  },
  // Connection state change handler
  onConnectionStateChange: (state: ConnectionState) => {
    console.log(`🔄 Connection state: ${state}`);
  }
});

// Connect to chat
client.connect().then(() => {
  console.log("🚀 Starting connection to Kick chat...");
}).catch((error) => {
  console.error("Failed to connect:", error);
});

client.on("ready", (channel) => {
  console.log(`✅ Bot connected to channel: ${channel?.name} (ID: ${channel?.id})`);
  console.log(`Current connection state: ${client.getConnectionState()}`);
  console.log(`Is connected: ${client.isConnected()}`);
});

client.on("ChatMessage", async (message: MessageData) => {
  console.log(`💬 ${message.sender.username}: ${message.content}`);

  // Example: respond to commands
  if (message.content.includes("!ping")) {
    console.log("Received ping command!");
  }

  if (message.content.includes("!disconnect")) {
    console.log("🔌 Disconnecting client...");
    client.disconnect();
  }

  if (message.content.includes("!status")) {
    console.log(`📊 Connection status: ${client.getConnectionState()}, Connected: ${client.isConnected()}`);
  }
});

client.on("Subscription", async (subscription) => {
  console.log(`🎉 New subscription: ${subscription.username}`);
});

client.on("disconnect", () => {
  console.log("🔌 Disconnected from chat");
});

// Enhanced error handling
client.on("error", (error: KickError) => {
  console.error(`🚨 Client error: ${error.type} - ${error.message}`);
  
  // Handle different types of errors
  switch (error.type) {
    case ErrorType.CONNECTION:
      console.log("Connection lost, client will attempt to reconnect...");
      break;
    case ErrorType.WEBSOCKET:
      console.log("WebSocket error occurred");
      break;
    case ErrorType.VALIDATION:
      console.log("Validation error - check your input");
      break;
  }
});

// Test listener management
const testListener = (message: MessageData) => {
  console.log(`Test listener: ${message.content}`);
};

// Add listener
client.on("ChatMessage", testListener);

// Remove listener after 30 seconds
setTimeout(() => {
  client.off("ChatMessage", testListener);
  console.log("🗑️ Removed test listener");
}, 30000);

// Test once listener
client.once("ChatMessage", (message: MessageData) => {
  console.log(`🔥 This will only fire once: ${message.content}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  console.log(`Final connection state: ${client.getConnectionState()}`);
  client.disconnect();
  setTimeout(() => process.exit(0), 1000);
});

console.log("🤖 Kick.js WebSocket-only bot example");
console.log("Features demonstrated:");
console.log("- WebSocket-only connection (no API dependencies)");
console.log("- Custom logger integration");
console.log("- Automatic reconnection with exponential backoff");
console.log("- Heartbeat mechanism");
console.log("- Proper listener management (on, off, once, removeAllListeners)");
console.log("- Connection state monitoring");
console.log("- Graceful shutdown");