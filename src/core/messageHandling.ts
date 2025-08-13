import type {
  MessageEvent,
  ChatMessage,
  Subscription,
  GiftedSubscriptionsEvent,
  StreamHostEvent,
  UserBannedEvent,
  UserUnbannedEvent,
  PinnedMessageCreatedEvent,
  MessageDeletedEvent,
} from "../types/events";
import { parseJSON } from "../utils/utils";
import type { Logger } from "../types/client";

// Default no-op logger for when no logger is provided
const defaultLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export const parseMessage = (message: string, logger: Logger = defaultLogger) => {
  try {
    const messageEventJSON = parseJSON<MessageEvent>(message);

    // switch event type
    switch (messageEventJSON.event) {
      case "App\\Events\\ChatMessageEvent": {
        const data = parseJSON<ChatMessage>(messageEventJSON.data);
        return { type: "ChatMessage", data };
      }
      case "App\\Events\\SubscriptionEvent": {
        const data = parseJSON<Subscription>(messageEventJSON.data);
        return { type: "Subscription", data };
      }
      case "App\\Events\\GiftedSubscriptionsEvent": {
        const data = parseJSON<GiftedSubscriptionsEvent>(messageEventJSON.data);
        return { type: "GiftedSubscriptions", data };
      }
      case "App\\Events\\StreamHostEvent": {
        const data = parseJSON<StreamHostEvent>(messageEventJSON.data);
        return { type: "StreamHost", data };
      }
      case "App\\Events\\MessageDeletedEvent": {
        const data = parseJSON<MessageDeletedEvent>(messageEventJSON.data);
        return { type: "MessageDeleted", data };
      }
      case "App\\Events\\UserBannedEvent": {
        const data = parseJSON<UserBannedEvent>(messageEventJSON.data);
        return { type: "UserBanned", data };
      }
      case "App\\Events\\UserUnbannedEvent": {
        const data = parseJSON<UserUnbannedEvent>(messageEventJSON.data);
        return { type: "UserUnbanned", data };
      }
      case "App\\Events\\PinnedMessageCreatedEvent": {
        const data = parseJSON<PinnedMessageCreatedEvent>(
          messageEventJSON.data,
        );
        return { type: "PinnedMessageCreated", data };
      }
      case "App\\Events\\PinnedMessageDeletedEvent": {
        const data = parseJSON<MessageDeletedEvent>(messageEventJSON.data);
        return { type: "PinnedMessageDeleted", data };
      }
      case "App\\Events\\PollUpdateEvent": {
        const data = parseJSON(messageEventJSON.data);
        return { type: "PollUpdate", data };
      }
      case "App\\Events\\PollDeleteEvent": {
        const data = parseJSON(messageEventJSON.data);
        return { type: "PollDelete", data };
      }

      // Pusher protocol events (not chat events)
      case "pusher:connection_established": {
        logger.debug("Pusher connection established");
        return { type: "PusherConnectionEstablished", data: parseJSON(messageEventJSON.data) };
      }
      case "pusher_internal:subscription_succeeded": {
        logger.debug("Pusher subscription succeeded");
        return { type: "PusherSubscriptionSucceeded", data: parseJSON(messageEventJSON.data) };
      }
      case "pusher:pong": {
        logger.debug("Pusher pong received");
        return { type: "PusherPong", data: parseJSON(messageEventJSON.data) };
      }
      case "pusher:ping": {
        logger.debug("Pusher ping received");
        return { type: "PusherPing", data: parseJSON(messageEventJSON.data) };
      }
      case "pusher:error": {
        logger.warn("Pusher error:", messageEventJSON.data);
        return { type: "PusherError", data: parseJSON(messageEventJSON.data) };
      }

      default: {
        logger.debug("Unknown event type:", messageEventJSON.event);
        return null;
      }
    }

    return null;
  } catch (error) {
    logger.error("Error parsing message:", error);
    return null;
  }
};
