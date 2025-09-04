import type { Command, Event, CommandHandler } from './types';

// Helper types to extract command details
type CommandData<C> = C extends Command<string, infer D> ? D : never;
type CommandType<C> = C extends Command<infer T, Record<string, unknown>> ? T : never;

// Field definition for command parameters
export interface FieldDefinition<T> {
  description: string;
  required?: T extends undefined ? false : true;
  flag?: boolean;
}

// The unified command handler definition
export interface UnifiedCommandHandler<C extends Command<string, Record<string, unknown>>> extends CommandHandler {
  alias: string;
  description: string;
  category?: string;
  fields: {
    [K in keyof CommandData<C>]: FieldDefinition<CommandData<C>[K]>;
  };
  examples: string[];
  // Override the handle type to match CommandHandler but with the specific command type
  handle: (command: Command) => Promise<Event | Event[] | void>;
}

/**
 * Define a command handler with full type safety and metadata
 * @param config The command handler configuration
 * @returns A command handler with manifest metadata
 */
export function defineCommandHandler<C extends Command<string, Record<string, unknown>>>(config: {
  name: CommandType<C>;
  alias: string;
  description: string;
  category?: string;
  fields: {
    [K in keyof CommandData<C>]: FieldDefinition<CommandData<C>[K]>;
  };
  examples: string[];
  handle: (command: C) => Promise<Event | Event[] | void>;
}): UnifiedCommandHandler<C> {
  // Cast the handle function to the base Command type for interface compatibility
  return {
    ...config,
    handle: config.handle as (command: Command) => Promise<Event | Event[] | void>,
  } as UnifiedCommandHandler<C>;
}
