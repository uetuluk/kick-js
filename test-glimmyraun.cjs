#!/usr/bin/env node

// Test script to verify the optimized kick-js library works with glimmyraun channel
const { createClient } = require('./dist/index.cjs');

console.log('🤖 Testing optimized kick-js library with glimmyraun channel...');
console.log('Features being tested:');
console.log('- WebSocket-only connection (no API dependencies)');
console.log('- Custom logger integration');
console.log('- Automatic reconnection with exponential backoff');
console.log('- Heartbeat mechanism');
console.log('- Proper listener management');
console.log('- Connection state monitoring');
console.log('');

// Create a custom logger to see what's happening
const logger = {
  debug: (message, ...args) => console.log(`[DEBUG] ${message}`, ...args),
  info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
  error: (message, error) => console.error(`[ERROR] ${message}`, error),
};

// Create client for glimmyraun channel
const client = createClient("glimmyraun", {
  logger, // Use our custom logger
  plainEmote: true, // Convert emotes to text
  connection: {
    autoReconnect: true,
    maxReconnectAttempts: 5, // Limit for testing
    reconnectInterval: 1000,
    heartbeatInterval: 15000, // Shorter for testing
  },
  onError: (error) => {
    console.error(`❌ Client Error: ${error.type} - ${error.message}`);
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
  },
  onConnectionStateChange: (state) => {
    console.log(`🔄 Connection state: ${state}`);
  }
});

// Track connection stats
let messageCount = 0;
let connectionStart = Date.now();

// Connect to chat
console.log('🚀 Connecting to glimmyraun chat...');
client.connect().then(() => {
  console.log('✅ Connection initiated successfully');
}).catch((error) => {
  console.error('❌ Failed to initiate connection:', error);
  process.exit(1);
});

// Handle ready event
client.on("ready", (channel) => {
  const connectionTime = Date.now() - connectionStart;
  console.log(`✅ Connected to channel: ${channel?.name || 'glimmyraun'} (ID: ${channel?.id || 'unknown'})`);
  console.log(`📊 Connection time: ${connectionTime}ms`);
  console.log(`🔗 Connection state: ${client.getConnectionState()}`);
  console.log(`📡 Is connected: ${client.isConnected()}`);
  console.log('👂 Listening for chat messages...');
});

// Handle chat messages
client.on("ChatMessage", (message) => {
  messageCount++;
  console.log(`💬 [${messageCount}] ${message.sender.username}: ${message.content}`);
  
  // Log additional message details for first few messages
  if (messageCount <= 3) {
    console.log(`   📝 Message ID: ${message.id}`);
    console.log(`   👤 Sender ID: ${message.sender.id}`);
    console.log(`   🕐 Timestamp: ${message.created_at}`);
    if (message.sender.identity?.badges?.length > 0) {
      console.log(`   🎖️  Badges: ${message.sender.identity.badges.map(b => b.type).join(', ')}`);
    }
  }
});

// Handle other events
client.on("Subscription", (sub) => {
  console.log(`🎉 New subscription: ${sub.username}`);
});

client.on("disconnect", () => {
  console.log('🔌 Disconnected from chat');
});

client.on("error", (error) => {
  console.error(`🚨 WebSocket error: ${error.message}`);
});

// Test listener management after 30 seconds
const testListener = (message) => {
  console.log(`🧪 Test listener: ${message.content}`);
};

setTimeout(() => {
  console.log('🧪 Testing listener management...');
  client.on("ChatMessage", testListener);
  
  setTimeout(() => {
    client.off("ChatMessage", testListener);
    console.log('🗑️ Test listener removed successfully');
  }, 10000);
}, 30000);

// Show periodic stats
setInterval(() => {
  const runtime = Math.floor((Date.now() - connectionStart) / 1000);
  console.log(`📊 Runtime: ${runtime}s | Messages: ${messageCount} | Connected: ${client.isConnected()}`);
}, 30000);

// Test once listener
client.once("ChatMessage", () => {
  console.log('🔥 Once listener fired (will only fire once)');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  console.log(`📊 Final stats:`);
  console.log(`   - Messages received: ${messageCount}`);
  console.log(`   - Runtime: ${Math.floor((Date.now() - connectionStart) / 1000)}s`);
  console.log(`   - Final connection state: ${client.getConnectionState()}`);
  
  client.disconnect();
  
  setTimeout(() => {
    console.log('👋 Test completed successfully!');
    process.exit(0);
  }, 1000);
});

console.log('ℹ️  Press Ctrl+C to stop the test\n');