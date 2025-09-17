import type { Command, Event } from '@auto-engineer/message-bus';

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
