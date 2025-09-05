import type { MessageBus, Command, UnifiedCommandHandler, Event } from '@auto-engineer/message-bus';
import type { FoldRegistration } from '../dsl/types';
import type { StateManager, FoldFunction } from './state-manager';
import createDebug from 'debug';

const debugBus = createDebug('auto-engineer:server:bus');

export class CommandRegistry {
  private commandHandlerNames: string[] = [];
  private commandMetadata: Map<
    string,
    { alias: string; description: string; package: string; version?: string; category?: string }
  > = new Map();
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

      this.extractUnifiedHandlerMetadata(handler, cmdHandler.name);
    } else {
      debugBus('Skipping invalid handler:', handler);
    }
  }

  private extractUnifiedHandlerMetadata(handler: unknown, commandName: string): void {
    if (typeof handler === 'object' && handler !== null && 'alias' in handler && 'description' in handler) {
      const unifiedHandler = handler as UnifiedCommandHandler<Command<string, Record<string, unknown>>>;
      debugBus('Extracting metadata from UnifiedCommandHandler:', commandName);

      this.setCommandMetadata(commandName, {
        alias: unifiedHandler.alias,
        description: unifiedHandler.description,
        package: unifiedHandler.package?.name ?? 'unknown',
        version: unifiedHandler.package?.version,
        category: unifiedHandler.category,
      });
    }
  }

  setCommandMetadata(
    commandName: string,
    metadata: { alias: string; description: string; package: string; version?: string; category?: string },
  ): void {
    this.commandMetadata.set(commandName, metadata);
    debugBus('Set metadata for command:', commandName, metadata);
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

  getCommandMetadata(): Map<
    string,
    { alias: string; description: string; package: string; version?: string; category?: string }
  > {
    return this.commandMetadata;
  }

  getFoldRegistry(): Map<string, FoldFunction<Record<string, unknown>>> {
    return this.foldRegistry;
  }
}
