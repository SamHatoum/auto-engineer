import { 
  BaseCommand, 
  BaseEvent, 
  BaseQuery, 
  BaseResult,
  CommandHandler, 
  EventHandler, 
  QueryHandler, 
  AckNackResponse 
} from './types';

export class MessageBus {
  private commandHandlers: Record<string, CommandHandler> = {};
  private eventHandlers: Record<string, EventHandler> = {};
  private queryHandlers: Record<string, QueryHandler> = {};

  registerCommandHandler(commandHandler: CommandHandler): void {
    this.commandHandlers[commandHandler.name] = commandHandler;
  }

  registerEventHandler(eventName: string, eventHandler: EventHandler): void {
    this.eventHandlers[eventName] = eventHandler;
  }

  registerQueryHandler(queryHandler: QueryHandler): void {
    this.queryHandlers[queryHandler.name] = queryHandler;
  }

  async sendCommand(command: BaseCommand): Promise<AckNackResponse> {
    const commandHandler = this.commandHandlers[command.type];
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
  }

  async publishEvent(event: BaseEvent): Promise<AckNackResponse> {
    const eventHandler = this.eventHandlers[event.type];
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
  }

  async executeQuery(query: BaseQuery): Promise<BaseResult> {
    const queryHandler = this.queryHandlers[query.type];
    if (!queryHandler) {
      throw new Error(`Query handler not found for query: ${query.type}`);
    }
    return queryHandler.handle(query);
  }
}