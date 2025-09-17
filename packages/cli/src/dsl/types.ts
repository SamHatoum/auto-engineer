import type { Command, Event } from '@auto-engineer/message-bus';

// Type utilities for automatic event extraction from command handlers
export type ExtractHandlerEvents<T> = T extends { handle: (...args: unknown[]) => Promise<infer R> } ? R : never;

// Global command handler registry interface - completely abstract
// This interface is intentionally empty and will be augmented by external packages
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandHandlerRegistry {
  // Augmented by external packages via module augmentation
}

// Automatic event mapping from registered handlers
export type AutoCommandEventMap = {
  [K in keyof CommandHandlerRegistry]: ExtractHandlerEvents<CommandHandlerRegistry[K]>;
};

// Type for automatically extracting events from commands
export type AutoSettledEvents<T extends readonly Command[]> = {
  [K in T[number]['type']]: K extends keyof AutoCommandEventMap ? AutoCommandEventMap[K][] : Event[];
};

export interface EventRegistration {
  type: 'on';
  eventType: string;
  handler: (event: Event) => Command | Command[] | DispatchAction | void;
}

export interface DispatchAction {
  type: 'dispatch' | 'dispatch-parallel' | 'dispatch-sequence' | 'dispatch-custom';
  command?: Command;
  commands?: Command[];
  commandFactory?: () => Command | Command[];
}

export interface FoldRegistration<S = unknown, E = Event> {
  type: 'fold';
  eventType: string;
  reducer: (state: S, event: E) => S;
}

export interface SettledRegistration {
  type: 'on-settled';
  commandTypes: readonly string[];
  handler: (events: Record<string, Event[]>) => void;
}

export type DslRegistration = EventRegistration | DispatchAction | FoldRegistration | SettledRegistration;

export interface ConfigDefinition {
  fileId: string;
  plugins: string[];
  aliases?: Record<string, unknown>;
  pipeline?: () => void;
}
