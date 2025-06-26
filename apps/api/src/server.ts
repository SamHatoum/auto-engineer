import { BaseCommand, BaseEvent, BaseQuery, CommandHandler, EventHandler, QueryHandler, BaseResult, AckNackResponse } from "./types";

const commandHandlers: Record<string, CommandHandler> = {};
const eventHandlers: Record<string, EventHandler> = {};
const queryHandlers: Record<string, QueryHandler> = {};

const registerCommandHandler = (commandHandler: CommandHandler) => {
  commandHandlers[commandHandler.name] = commandHandler;
};

const registerEventHandler = (eventName: string, eventHandler: EventHandler) => {
  eventHandlers[eventName] = eventHandler;
};

const registerQueryHandler = (queryHandler: QueryHandler) => {
  queryHandlers[queryHandler.name] = queryHandler;
};

const sendCommand = async (command: BaseCommand): Promise<AckNackResponse> => {
  const commandHandler = commandHandlers[command.type];
  if (!commandHandler) {
    return {
      status: 'nack',
      error: `Command handler not found for command: ${command.type}`,
      timestamp: new Date(),
      requestId: command.requestId
    };
  }

  try {
    return await commandHandler.handle(command);
  } catch (error) {
    return {
      status: 'nack',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date(),
      requestId: command.requestId
    };
  }
};

const publishEvent = async (event: BaseEvent): Promise<AckNackResponse> => {
  const eventHandler = eventHandlers[event.type];
  if (!eventHandler) {
    return {
      status: 'nack',
      error: `Event handler not found for event: ${event.type}`,
      timestamp: new Date(),
      requestId: event.requestId
    };
  }

  try {
    return await eventHandler.handle(event);
  } catch (error) {
    return {
      status: 'nack',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date(),
      requestId: event.requestId
    };
  }
};

const executeQuery = async (query: BaseQuery): Promise<BaseResult> => {
  const queryHandler = queryHandlers[query.type];
  if (!queryHandler) {
    throw new Error(`Query handler not found for query: ${query.type}`);
  }
  return queryHandler.handle(query);
};

export const server = {
  registerCommandHandler,
  registerEventHandler,
  registerQueryHandler,
  sendCommand,
  publishEvent,
  executeQuery
}