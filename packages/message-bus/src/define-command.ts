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

// Package metadata interface
export interface PackageMetadata {
  name: string;
  version?: string;
  description?: string;
}

type ExtractEventTypes<T> =
  T extends Promise<infer U>
    ? U extends Event<infer EventType, Record<string, unknown>>
      ? EventType
      : U extends Event<infer EventType1, Record<string, unknown>> | Event<infer EventType2, Record<string, unknown>>
        ? EventType1 | EventType2
        : never
    : never;

export interface UnifiedCommandHandler<C extends Command<string, Record<string, unknown>>> extends CommandHandler {
  alias: string;
  description: string;
  category?: string;
  icon?: string;
  package?: PackageMetadata; // Made optional since plugin loader will extract from package.json
  fields: {
    [K in keyof CommandData<C>]: FieldDefinition<CommandData<C>[K]>;
  };
  examples: string[];
  events?: string[];
  // Override the handle type to match CommandHandler but with the specific command type
  handle: (command: Command) => Promise<Event | Event[]>;
}

/**
 * Define a command handler with full type safety and metadata
 * @param config The command handler configuration
 * @returns A command handler with manifest metadata
 */
export function defineCommandHandler<
  C extends Command<string, Record<string, unknown>>,
  H extends (command: C) => Promise<Event<string, Record<string, unknown>>>,
>(config: {
  name: CommandType<C>;
  alias: string;
  description: string;
  category?: string;
  icon?: string;
  package?: PackageMetadata; // Made optional since plugin loader will extract from package.json
  fields: {
    [K in keyof CommandData<C>]: FieldDefinition<CommandData<C>[K]>;
  };
  examples: string[];
  handle: H;
  events: Array<ExtractEventTypes<ReturnType<H>>>;
}): UnifiedCommandHandler<C>;

/**
 * Define a command handler with manual event specification (without generics)
 * @param config The command handler configuration
 * @returns A command handler with manifest metadata
 */
export function defineCommandHandler(config: {
  name: string;
  alias: string;
  description: string;
  category?: string;
  icon?: string;
  package?: PackageMetadata;
  fields: Record<string, FieldDefinition<unknown>>;
  examples: string[];
  handle: (command: Command) => Promise<Event | Event[]>;
  events: string[];
}): CommandHandler;

export function defineCommandHandler(config: {
  name: string;
  alias: string;
  description: string;
  category?: string;
  icon?: string;
  package?: PackageMetadata;
  fields: Record<string, FieldDefinition<unknown>>;
  examples: string[];
  handle: (command: Command) => Promise<Event | Event[]>;
  events: string[];
}): CommandHandler {
  // Cast the handle function to the base Command type for interface compatibility
  return {
    ...config,
    handle: config.handle as (command: Command) => Promise<Event | Event[]>,
  };
}
