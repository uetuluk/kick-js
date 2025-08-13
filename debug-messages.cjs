#!/usr/bin/env node

// Debug script to see ALL WebSocket messages from Kick
const { createClient } = require('./dist/index.cjs');

console.log('🔍 Debugging ALL WebSocket messages from glimmyraun channel...');

// Create a logger that shows EVERYTHING
const debugLogger = {
  debug: (message, ...args) => console.log(`[DEBUG] ${message}`, ...args),
  info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
  error: (message, error) => console.error(`[ERROR] ${message}`, error),
};

const client = createClient("glimmyraun", {
  logger: debugLogger,
  plainEmote: true,
  onError: (error) => {
    console.error(`❌ Error: ${error.message}`);
  },
  onConnectionStateChange: (state) => {
    console.log(`🔄 State: ${state}`);
  }
});

// Monkey patch to intercept ALL WebSocket messages before parsing
const originalSocket = client.socket;

let messageCount = 0;

client.connect().then(() => {
  console.log('✅ Connected, intercepting ALL WebSocket messages...');
}).catch(console.error);

client.on("ready", (channel) => {
  console.log(`✅ Ready: ${JSON.stringify(channel)}`);
  
  // Try to access the internal socket to log raw messages
  setTimeout(() => {
    console.log('🔍 Looking for internal WebSocket to intercept messages...');
    
    // Try to find the WebSocket instance in the client
    const keys = Object.keys(client);
    console.log('Client keys:', keys);
    
    // Let's try to intercept messages at the parseMessage level
    console.log('⚠️ Send a chat message now - I will intercept and log it!');
  }, 2000);
});

// Log ALL events that come through
const originalEmit = client.on.bind(client);

// Override the message handler to see raw data
client.on = function(event, listener) {
  if (event === "ChatMessage") {
    const wrappedListener = (data) => {
      console.log('🎯 INTERCEPTED ChatMessage:', JSON.stringify(data, null, 2));
      listener(data);
    };
    return originalEmit(event, wrappedListener);
  }
  return originalEmit(event, listener);
};

// Listen for chat messages with detailed logging
client.on("ChatMessage", (message) => {
  messageCount++;
  console.log(`💬 [${messageCount}] CHAT MESSAGE RECEIVED!`);
  console.log(`   Raw data: ${JSON.stringify(message, null, 2)}`);
});

// Also listen for ALL possible events
const eventTypes = [
  'ready', 'disconnect', 'error', 'ChatMessage', 'Subscription', 
  'GiftedSubscriptions', 'StreamHost', 'MessageDeleted', 'UserBanned', 
  'UserUnbanned', 'PinnedMessageCreated', 'PinnedMessageDeleted', 
  'PollUpdate', 'PollDelete'
];

eventTypes.forEach(eventType => {
  client.on(eventType, (data) => {
    if (eventType !== 'ready') {
      console.log(`📡 Event [${eventType}]:`, JSON.stringify(data, null, 2));
    }
  });
});

setTimeout(() => {
  console.log(`\n📊 After 20 seconds:`);
  console.log(`   - Connected: ${client.isConnected()}`);
  console.log(`   - State: ${client.getConnectionState()}`);
  console.log(`   - Messages: ${messageCount}`);
  console.log(`\n💬 SEND A CHAT MESSAGE TO glimmyraun NOW!`);
}, 20000);

process.on('SIGINT', () => {
  console.log(`\n📊 Final count: ${messageCount} chat messages received`);
  client.disconnect();
  process.exit(0);
});