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

export type DslRegistration = EventRegistration | DispatchAction | FoldRegistration;

export interface ConfigDefinition {
  plugins: string[];
  aliases?: Record<string, unknown>;
  pipeline?: () => void;
}
