import type { UnifiedCommandHandler, Command } from '@auto-engineer/message-bus';
import createDebug from 'debug';

const debug = createDebug('auto-engineer:server:metadata');

export interface CommandMetadata {
  name: string;
  alias: string;
  description: string;
  package: string;
  version?: string;
  category?: string;
  icon?: string;
  events?: string[];
}

export class CommandMetadataService {
  private commandMetadata: Map<string, CommandMetadata> = new Map();
  private eventToCommandMapping: Map<string, string> = new Map();

  extractUnifiedHandlerMetadata(handler: unknown, commandName: string): void {
    if (!this.isValidUnifiedHandler(handler)) {
      return;
    }

    const unifiedHandler = handler as UnifiedCommandHandler<Command<string, Record<string, unknown>>>;
    debug('Extracting metadata from UnifiedCommandHandler:', commandName);

    const events = this.extractEvents(unifiedHandler);
    const metadata = this.buildCommandMetadata(commandName, unifiedHandler, events);

    this.setCommandMetadata(commandName, metadata);
    this.mapEventsToCommand(events, commandName);
  }

  private isValidUnifiedHandler(handler: unknown): boolean {
    return typeof handler === 'object' && handler !== null && 'alias' in handler && 'description' in handler;
  }

  private extractEvents(
    unifiedHandler: UnifiedCommandHandler<Command<string, Record<string, unknown>>>,
  ): string[] | undefined {
    return 'events' in unifiedHandler ? (unifiedHandler.events as string[]) : undefined;
  }

  private buildCommandMetadata(
    commandName: string,
    unifiedHandler: UnifiedCommandHandler<Command<string, Record<string, unknown>>>,
    events: string[] | undefined,
  ): CommandMetadata {
    return {
      name: commandName,
      alias: unifiedHandler.alias,
      description: unifiedHandler.description,
      package: unifiedHandler.package?.name ?? 'unknown',
      version: unifiedHandler.package?.version,
      category: unifiedHandler.category,
      icon: unifiedHandler.icon,
      events,
    };
  }

  private mapEventsToCommand(events: string[] | undefined, commandName: string): void {
    if (!events) {
      return;
    }

    for (const eventType of events) {
      this.eventToCommandMapping.set(eventType, commandName);
      debug('Mapped event %s -> command %s', eventType, commandName);
    }
  }

  setCommandMetadata(commandName: string, metadata: CommandMetadata): void {
    this.commandMetadata.set(commandName, metadata);
    debug('Set metadata for command:', commandName, metadata);
  }

  getCommandMetadata(commandName: string): CommandMetadata | undefined {
    return this.commandMetadata.get(commandName);
  }

  getAllCommandMetadata(): Map<string, CommandMetadata> {
    return this.commandMetadata;
  }

  getAllCommandsMetadata(): CommandMetadata[] {
    return Array.from(this.commandMetadata.values());
  }

  hasMetadata(commandName: string): boolean {
    return this.commandMetadata.has(commandName);
  }

  getEventToCommandMapping(): Map<string, string> {
    return this.eventToCommandMapping;
  }

  getCommandForEvent(eventType: string): string | undefined {
    return this.eventToCommandMapping.get(eventType);
  }
}
