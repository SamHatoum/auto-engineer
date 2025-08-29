import { Command, Event, CommandHandler, EventHandler, EventSubscription } from './types';
import createDebug from 'debug';

const debug = createDebug('message-bus');
const debugCommand = createDebug('message-bus:command');
const debugEvent = createDebug('message-bus:event');
const debugHandler = createDebug('message-bus:handler');

// Set non-error-like colors for debug namespaces
// Colors: 0=gray, 1=red, 2=green, 3=yellow, 4=blue, 5=magenta, 6=cyan
debug.color = '6'; // cyan
debugCommand.color = '4'; // blue
debugEvent.color = '2'; // green
debugHandler.color = '6'; // cyan

type MessageBusState = {
  commandHandlers: Record<string, CommandHandler>;
  eventHandlers: Record<string, EventHandler[]>;
  allEventHandlers: EventHandler[]; // Handlers that receive ALL events
};

export function createMessageBus() {
  debug('Creating new message bus instance');
  const state: MessageBusState = {
    commandHandlers: {},
    eventHandlers: {},
    allEventHandlers: [],
  };
  debug('Message bus state initialized');

  function registerCommandHandler<TCommand extends Command>(commandHandler: CommandHandler<TCommand>): void {
    debugHandler('Registering command handler: %s', commandHandler.name);

    if (state.commandHandlers[commandHandler.name] !== undefined) {
      const error = `Command handler already registered for command: ${commandHandler.name}`;
      debugHandler('ERROR: %s', error);
      throw new Error(error);
    }

    state.commandHandlers[commandHandler.name] = commandHandler as CommandHandler;
    debugHandler('Handler registered successfully, total handlers: %d', Object.keys(state.commandHandlers).length);
  }

  async function sendCommand<TCommand extends Command>(command: TCommand): Promise<void> {
    debugCommand('Sending command: %s', command.type);
    debugCommand('  Request ID: %s', command.requestId ?? 'none');
    debugCommand('  Correlation ID: %s', command.correlationId ?? 'none');
    debugCommand('  Data keys: %o', Object.keys(command.data));

    const commandHandler = state.commandHandlers[command.type];
    if (commandHandler === undefined) {
      debugCommand('ERROR: No handler found for command: %s', command.type);
      debugCommand('Available handlers: %o', Object.keys(state.commandHandlers));
      throw new Error(`Command handler not found for command: ${command.type}`);
    }

    debugCommand('Handler found for command: %s', command.type);

    try {
      debugCommand('Executing handler for: %s', command.type);
      const startTime = Date.now();

      const result = await commandHandler.handle(command);

      const duration = Date.now() - startTime;
      debugCommand('Handler executed successfully in %dms', duration);

      // If handler returned events, publish them
      if (result) {
        const events = Array.isArray(result) ? result : [result];
        for (const event of events) {
          debugCommand('Publishing event from command handler: %s', event.type);
          await publishEvent(event);
        }
      }
    } catch (error) {
      debugCommand('ERROR: Handler failed for command %s: %O', command.type, error);
      throw new Error(`Command handling failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  function subscribeToEvent<TEvent extends Event>(eventType: string, handler: EventHandler<TEvent>): EventSubscription {
    debugEvent('Subscribing to event: %s with handler: %s', eventType, handler.name);

    if (state.eventHandlers[eventType] === undefined) {
      state.eventHandlers[eventType] = [];
      debugEvent('Created new handler array for event type: %s', eventType);
    }

    state.eventHandlers[eventType].push(handler as EventHandler);
    debugEvent('Handler added, total handlers for %s: %d', eventType, state.eventHandlers[eventType].length);

    return {
      unsubscribe: () => {
        debugEvent('Unsubscribing handler %s from event %s', handler.name, eventType);
        const handlers = state.eventHandlers[eventType];
        if (handlers !== undefined) {
          const index = handlers.indexOf(handler as EventHandler);
          if (index > -1) {
            handlers.splice(index, 1);
            debugEvent('Handler removed, remaining handlers for %s: %d', eventType, handlers.length);
            if (handlers.length === 0) {
              delete state.eventHandlers[eventType];
              debugEvent('No handlers left for %s, removed from state', eventType);
            }
          }
        }
      },
    };
  }

  async function publishEvent<TEvent extends Event>(event: TEvent): Promise<void> {
    debugEvent('Publishing event: %s', event.type);
    debugEvent('  Request ID: %s', event.requestId ?? 'none');
    debugEvent('  Correlation ID: %s', event.correlationId ?? 'none');
    debugEvent('  Timestamp: %s', event.timestamp || 'none');
    debugEvent('  Data keys: %o', Object.keys(event.data));

    // Get both specific handlers and all-event handlers
    const specificHandlers = state.eventHandlers[event.type] ?? [];
    const allHandlers = state.allEventHandlers;
    const handlers = [...specificHandlers, ...allHandlers];

    debugEvent(
      'Found %d specific + %d all-event handlers for event %s',
      specificHandlers.length,
      allHandlers.length,
      event.type,
    );

    if (handlers.length === 0) {
      debugEvent('No handlers registered for event: %s', event.type);
      return;
    }

    const results = await Promise.allSettled(
      handlers.map((handler) => {
        debugEvent('Executing handler %s for event %s', handler.name, event.type);
        try {
          return handler.handle(event);
        } catch (error) {
          debugEvent('ERROR: Handler %s failed for event %s: %O', handler.name, event.type, error);
          throw error;
        }
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      debugEvent('ERROR: %d/%d handlers failed for event %s', failures.length, handlers.length, event.type);
      failures.forEach((failure, index) => {
        if (failure.status === 'rejected') {
          debugEvent('  Handler failure %d: %O', index + 1, failure.reason);
        }
      });
    } else {
      debugEvent('All handlers executed successfully for event %s', event.type);
    }
  }

  function subscribeAll<TEvent extends Event = Event>(handler: EventHandler<TEvent>): EventSubscription {
    debugEvent('Subscribing to ALL events with handler: %s', handler.name);

    state.allEventHandlers.push(handler as EventHandler);
    debugEvent('All-event handler added, total all-event handlers: %d', state.allEventHandlers.length);

    return {
      unsubscribe: () => {
        debugEvent('Unsubscribing all-event handler: %s', handler.name);
        const index = state.allEventHandlers.indexOf(handler as EventHandler);
        if (index > -1) {
          state.allEventHandlers.splice(index, 1);
          debugEvent('All-event handler removed, remaining: %d', state.allEventHandlers.length);
        }
      },
    };
  }

  function registerEventHandler<TEvent extends Event>(eventHandler: EventHandler<TEvent>): EventSubscription {
    debugHandler('Registering event handler: %s', eventHandler.name);
    // For backward compatibility, infer event type from handler name
    const eventType = eventHandler.name.replace(/Handler$/, '');
    return subscribeToEvent(eventType, eventHandler);
  }

  debug('Message bus creation complete');
  debug(
    '  Available methods: registerCommandHandler, sendCommand, publishEvent, subscribeToEvent, subscribeAll, registerEventHandler',
  );

  return {
    registerCommandHandler,
    registerEventHandler,
    sendCommand,
    publishEvent,
    subscribeToEvent,
    subscribeAll,
  };
}

export type MessageBus = ReturnType<typeof createMessageBus>;
