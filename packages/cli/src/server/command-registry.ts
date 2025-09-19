import type { MessageBus, Command, Event } from '@auto-engineer/message-bus';
import type { FoldRegistration } from '../dsl/types';
import type { StateManager, FoldFunction } from './state-manager';
import { CommandMetadataService, type CommandMetadata } from './command-metadata-service';
import createDebug from 'debug';

const debugBus = createDebug('auto-engineer:server:bus');

export class CommandRegistry {
  private commandHandlerNames: string[] = [];
  private metadataService: CommandMetadataService = new CommandMetadataService();
  private foldRegistry: Map<string, FoldFunction<Record<string, unknown>>> = new Map();

  constructor(
    private messageBus: MessageBus,
    private stateManager: StateManager<Record<string, unknown>>,
  ) {}

  registerCommandHandlers(handlers: unknown[]): void {
    debugBus('registerCommandHandlers called with', handlers.length, 'handlers');
    debugBus('Current commandHandlerNames:', this.commandHandlerNames);

    for (const handler of handlers) {
      this.processCommandHandler(handler);
    }

    debugBus('After registration, commandHandlerNames:', this.commandHandlerNames);
  }

  private processCommandHandler(handler: unknown): void {
    if (
      handler !== null &&
      handler !== undefined &&
      typeof handler === 'object' &&
      'name' in handler &&
      'handle' in handler
    ) {
      const cmdHandler = handler as { name: string; handle: (cmd: Command) => Promise<Event | Event[] | void> };
      debugBus('Registering command handler:', cmdHandler.name);
      this.messageBus.registerCommandHandler(cmdHandler);
      this.commandHandlerNames.push(cmdHandler.name);

      this.metadataService.extractUnifiedHandlerMetadata(handler, cmdHandler.name);
    } else {
      debugBus('Skipping invalid handler:', handler);
    }
  }

  setCommandMetadata(commandName: string, metadata: CommandMetadata): void {
    this.metadataService.setCommandMetadata(commandName, metadata);
  }

  registerFold(registration: FoldRegistration): void {
    debugBus('Registering fold for:', registration.eventType);
    const foldFn = registration.reducer as FoldFunction<Record<string, unknown>>;
    this.stateManager.registerFold(registration.eventType, foldFn);
    this.foldRegistry.set(registration.eventType, foldFn);
  }

  getCommandHandlerNames(): string[] {
    return this.commandHandlerNames;
  }

  getCommandMetadata(): Map<string, CommandMetadata> {
    return this.metadataService.getAllCommandMetadata();
  }

  getMetadataService(): CommandMetadataService {
    return this.metadataService;
  }

  getFoldRegistry(): Map<string, FoldFunction<Record<string, unknown>>> {
    return this.foldRegistry;
  }
}
