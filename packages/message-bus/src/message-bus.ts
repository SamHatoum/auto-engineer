import { Command, Event, CommandHandler } from './types';

type MessageBusState = {
  commandHandlers: Record<string, CommandHandler>;
};

export function createMessageBus() {
  const state: MessageBusState = {
    commandHandlers: {},
  };

  function registerCommandHandler<TCommand extends Command>(commandHandler: CommandHandler<TCommand>): void {
    state.commandHandlers[commandHandler.name] = commandHandler as CommandHandler;
  }

  async function sendCommand<TCommand extends Command>(command: TCommand): Promise<void> {
    const commandHandler = state.commandHandlers[command.type];
    if (commandHandler === undefined) {
      throw new Error(`Command handler not found for command: ${command.type}`);
    }

    try {
      await commandHandler.handle(command);
    } catch (error) {
      throw new Error(`Command handling failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  function publishEvent<TEvent extends Event>(event: TEvent): void {
    // Event publishing is now handled by the utility functions
    console.log('Publishing event:', event.type);
  }

  return {
    registerCommandHandler,
    sendCommand,
    publishEvent,
  };
}

export type MessageBus = ReturnType<typeof createMessageBus>;
