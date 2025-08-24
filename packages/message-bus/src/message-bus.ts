import { Command, Event, CommandHandler } from './types';
import createDebug from 'debug';

const debug = createDebug('message-bus');
const debugCommand = createDebug('message-bus:command');
const debugEvent = createDebug('message-bus:event');
const debugHandler = createDebug('message-bus:handler');

type MessageBusState = {
  commandHandlers: Record<string, CommandHandler>;
};

export function createMessageBus() {
  debug('Creating new message bus instance');
  const state: MessageBusState = {
    commandHandlers: {},
  };
  debug('Message bus state initialized');

  function registerCommandHandler<TCommand extends Command>(commandHandler: CommandHandler<TCommand>): void {
    debugHandler('Registering command handler: %s', commandHandler.name);

    if (state.commandHandlers[commandHandler.name] !== undefined) {
      debugHandler('WARNING: Overwriting existing handler for: %s', commandHandler.name);
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

      await commandHandler.handle(command);

      const duration = Date.now() - startTime;
      debugCommand('Handler executed successfully in %dms', duration);
    } catch (error) {
      debugCommand('ERROR: Handler failed for command %s: %O', command.type, error);
      throw new Error(`Command handling failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  function publishEvent<TEvent extends Event>(event: TEvent): void {
    debugEvent('Publishing event: %s', event.type);
    debugEvent('  Request ID: %s', event.requestId ?? 'none');
    debugEvent('  Correlation ID: %s', event.correlationId ?? 'none');
    debugEvent('  Timestamp: %s', event.timestamp || 'none');
    debugEvent('  Data keys: %o', Object.keys(event.data));

    // Event publishing is now handled by the utility functions
    console.log('Publishing event:', event.type);
  }

  debug('Message bus creation complete');
  debug('  Available methods: registerCommandHandler, sendCommand, publishEvent');

  return {
    registerCommandHandler,
    sendCommand,
    publishEvent,
  };
}

export type MessageBus = ReturnType<typeof createMessageBus>;
