import type { UnifiedCommandHandler, Command } from '@auto-engineer/message-bus';
import createDebug from 'debug';

const debug = createDebug('auto-engineer:server:metadata');

export interface CommandMetadata {
  alias: string;
  description: string;
  package: string;
  version?: string;
  category?: string;
  icon?: string;
}

export class CommandMetadataService {
  private commandMetadata: Map<string, CommandMetadata> = new Map();

  extractUnifiedHandlerMetadata(handler: unknown, commandName: string): void {
    if (typeof handler === 'object' && handler !== null && 'alias' in handler && 'description' in handler) {
      const unifiedHandler = handler as UnifiedCommandHandler<Command<string, Record<string, unknown>>>;
      debug('Extracting metadata from UnifiedCommandHandler:', commandName);

      this.setCommandMetadata(commandName, {
        alias: unifiedHandler.alias,
        description: unifiedHandler.description,
        package: unifiedHandler.package?.name ?? 'unknown',
        version: unifiedHandler.package?.version,
        category: unifiedHandler.category,
      });
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

  hasMetadata(commandName: string): boolean {
    return this.commandMetadata.has(commandName);
  }
}
