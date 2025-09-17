import type { Command, Event } from '@auto-engineer/message-bus';
import type {
  EventRegistration,
  DispatchAction,
  FoldRegistration,
  DslRegistration,
  ConfigDefinition,
  SettledRegistration,
} from './types';

// Track registrations when DSL functions are called
let registrations: DslRegistration[] = [];
let pendingDispatches: DispatchAction[] = [];

/**
 * Register an event handler that will execute when the specified event occurs
 */
export function on<T extends Event>(
  eventType: string | ((event: T) => void),
  handler?: (event: T) => Command | Command[] | DispatchAction | void,
): EventRegistration | void {
  // Support both forms: on('EventName', handler) and on((event: EventType) => ...)
  if (typeof eventType === 'function') {
    // Extract event type from function parameter type (will be handled by config parser)
    const registration: EventRegistration = {
      type: 'on',
      eventType: '', // Will be inferred from type
      handler: eventType as (event: Event) => Command | Command[] | DispatchAction | void,
    };
    registrations.push(registration as unknown as DslRegistration);
    return registration;
  }

  if (handler) {
    const registration: EventRegistration = {
      type: 'on',
      eventType,
      handler: handler as (event: Event) => Command | Command[] | DispatchAction | void,
    };
    registrations.push(registration as unknown as DslRegistration);
    return registration;
  }
}

/**
 * Wait for all specified commands to settle and collect their events
 */
function settled<
  T extends Command,
  U extends Command = never,
  V extends Command = never,
  W extends Command = never,
  X extends Command = never,
>(
  commandTypes: [T, U, V, W, X] extends [Command, never, never, never, never]
    ? [T['type']]
    : [T, U, V, W, X] extends [Command, Command, never, never, never]
      ? [T['type'], U['type']]
      : [T, U, V, W, X] extends [Command, Command, Command, never, never]
        ? [T['type'], U['type'], V['type']]
        : [T, U, V, W, X] extends [Command, Command, Command, Command, never]
          ? [T['type'], U['type'], V['type'], W['type']]
          : [T, U, V, W, X] extends [Command, Command, Command, Command, Command]
            ? [T['type'], U['type'], V['type'], W['type'], X['type']]
            : never,
  callback: (
    events: [T, U, V, W, X] extends [Command, never, never, never, never]
      ? { [K in T['type']]: Event[] }
      : [T, U, V, W, X] extends [Command, Command, never, never, never]
        ? { [K in T['type'] | U['type']]: Event[] }
        : [T, U, V, W, X] extends [Command, Command, Command, never, never]
          ? { [K in T['type'] | U['type'] | V['type']]: Event[] }
          : [T, U, V, W, X] extends [Command, Command, Command, Command, never]
            ? { [K in T['type'] | U['type'] | V['type'] | W['type']]: Event[] }
            : [T, U, V, W, X] extends [Command, Command, Command, Command, Command]
              ? { [K in T['type'] | U['type'] | V['type'] | W['type'] | X['type']]: Event[] }
              : never,
  ) => void,
): SettledRegistration {
  const registration: SettledRegistration = {
    type: 'on-settled',
    commandTypes: commandTypes as readonly string[],
    handler: callback as (events: Record<string, Event[]>) => void,
  };
  registrations.push(registration as unknown as DslRegistration);
  return registration;
}

on.settled = settled;

/**
 * Dispatch a command to the message bus
 */
export function dispatch<T extends Command>(command: T): DispatchAction {
  const action: DispatchAction = {
    type: 'dispatch',
    command,
  };
  pendingDispatches.push(action);
  return action;
}

/**
 * Dispatch multiple commands in parallel
 */
dispatch.parallel = <T extends Command>(commands: T[]): DispatchAction => {
  const action: DispatchAction = {
    type: 'dispatch-parallel',
    commands: commands as Command[],
  };
  pendingDispatches.push(action);
  return action;
};

/**
 * Dispatch multiple commands in sequence
 */
dispatch.sequence = <T extends Command>(commands: T[]): DispatchAction => {
  const action: DispatchAction = {
    type: 'dispatch-sequence',
    commands: commands as Command[],
  };
  pendingDispatches.push(action);
  return action;
};

/**
 * Dispatch a command based on custom logic
 */
dispatch.custom = <T extends Command>(commandFactory: () => T | T[]): DispatchAction => {
  const action: DispatchAction = {
    type: 'dispatch-custom',
    commandFactory: commandFactory as () => Command | Command[],
  };
  pendingDispatches.push(action);
  return action;
};

/**
 * Register a fold function to update state when an event occurs
 */
export function fold<S, E extends Event>(
  eventType: string | ((state: S, event: E) => S),
  reducer?: (state: S, event: E) => S,
): FoldRegistration<S, E> | void {
  // Support both forms: fold('EventName', reducer) and fold<State, Event>((state, event) => ...)
  if (typeof eventType === 'function') {
    const registration: FoldRegistration<S, E> = {
      type: 'fold',
      eventType: '', // Will be inferred from type
      reducer: eventType,
    };
    registrations.push(registration as unknown as DslRegistration);
    return registration;
  }

  if (reducer) {
    const registration: FoldRegistration<S, E> = {
      type: 'fold',
      eventType,
      reducer,
    };
    registrations.push(registration as unknown as DslRegistration);
    return registration;
  }
}

/**
 * Get all registrations and clear the list
 */
export function getRegistrations(): DslRegistration[] {
  const result = [...registrations];
  registrations = [];
  return result;
}

/**
 * Get all pending dispatches and clear the list
 */
export function getPendingDispatches(): DispatchAction[] {
  const result = [...pendingDispatches];
  pendingDispatches = [];
  return result;
}

/**
 * Create an Auto configuration with plugins and pipeline
 */
export function autoConfig(config: ConfigDefinition): ConfigDefinition {
  return config;
}
