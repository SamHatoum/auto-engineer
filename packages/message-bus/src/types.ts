// Core CQRS types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DefaultRecord = Record<string, any>;

export type Command<CommandType extends string = string, CommandData extends DefaultRecord = DefaultRecord> = Readonly<{
  type: CommandType;
  data: Readonly<CommandData>;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}>;

export type Event<EventType extends string = string, EventData extends DefaultRecord = DefaultRecord> = Readonly<{
  type: EventType;
  data: EventData;
  timestamp?: Date;
  requestId?: string;
  correlationId?: string;
}>;

// Utility functions
export function on<T>(_handler: (event: T) => void) {}

export function dispatch<T>(_command: T) {}
dispatch.parallel = <T>(_commands: T[]) => {};
dispatch.sequence = <T>(_commands: T[]) => {};
dispatch.custom = <T>(_commandFactory: () => T) => {};

export function fold<T>(_reducer: (event: T) => string) {}

export type CommandHandler<TCommand extends Command = Command, TEvent extends Event = Event> = {
  name: string;
  handle: (command: TCommand) => Promise<TEvent | TEvent[] | void>;
};

export type EventHandler<TEvent extends Event = Event> = {
  name: string;
  handle: (event: TEvent) => Promise<void> | void;
};

export type EventSubscription = {
  unsubscribe: () => void;
};
