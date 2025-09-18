import type { Command, Event } from '@auto-engineer/message-bus';
import type {
  EventRegistration,
  DispatchAction,
  FoldRegistration,
  DslRegistration,
  ConfigDefinition,
  SettledRegistration,
  SettledHandlerConfig,
} from './types';
import type { CommandMetadataService } from '../server/command-metadata-service';

let registrations: DslRegistration[] = [];
let pendingDispatches: DispatchAction[] = [];

export function on<T extends Event>(
  eventType: string | ((event: T) => void),
  handler?: (event: T) => Command | Command[] | DispatchAction | void,
): EventRegistration | void {
  if (typeof eventType === 'function') {
    const registration: EventRegistration = {
      type: 'on',
      eventType: '',
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
  callbackOrConfig:
    | ((
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
      ) => void)
    | SettledHandlerConfig,
): SettledRegistration {
  const commandTypesArray = commandTypes as readonly string[];

  if (typeof callbackOrConfig === 'function') {
    const registration: SettledRegistration = {
      type: 'on-settled',
      commandTypes: commandTypesArray,
      handler: callbackOrConfig as (events: Record<string, Event[]>) => void,
    };
    registrations.push(registration as unknown as DslRegistration);
    return registration;
  } else {
    const { dispatches, handler } = callbackOrConfig;

    const wrappedHandler = (events: Record<string, Event[]>) => {
      const validatedDispatch = <TCommand extends Command>(command: TCommand): void => {
        if (!dispatches.includes(command.type)) {
          throw new Error(`Command type "${command.type}" is not declared in dispatches list`);
        }

        const action: DispatchAction = {
          type: 'dispatch',
          command,
        };
        pendingDispatches.push(action);
      };

      handler(events, validatedDispatch);
    };

    const registration: SettledRegistration = {
      type: 'on-settled',
      commandTypes: commandTypesArray,
      handler: wrappedHandler,
      dispatches,
    };
    registrations.push(registration as unknown as DslRegistration);
    return registration;
  }
}

on.settled = settled;

/**
 * Dispatch a command to the message bus
 */
export function dispatch<T extends Command>(command: T): DispatchAction;
export function dispatch<T extends Command>(commandType: T['type'], data: T['data']): Command;
export function dispatch<TDispatchCommands extends Command>(
  commandTypes: readonly TDispatchCommands['type'][],
  handler: (
    events: Record<string, Event[]>,
    send: <TCommand extends TDispatchCommands>(command: TCommand) => void,
  ) => void,
): SettledHandlerConfig<TDispatchCommands>;
export function dispatch<T extends Command>(
  commandOrTypeOrTypes: T | T['type'] | readonly T['type'][],
  dataOrHandler?:
    | T['data']
    | ((events: Record<string, Event[]>, send: <TCommand extends T>(command: TCommand) => void) => void),
): DispatchAction | Command | SettledHandlerConfig<T> {
  // Array pattern for on.settled
  if (Array.isArray(commandOrTypeOrTypes)) {
    const commandTypes = commandOrTypeOrTypes;
    const handler = dataOrHandler as (
      events: Record<string, Event[]>,
      send: <TCommand extends T>(command: TCommand) => void,
    ) => void;

    return {
      dispatches: commandTypes,
      handler,
    };
  }

  // Object pattern for full command
  if (
    typeof commandOrTypeOrTypes === 'object' &&
    commandOrTypeOrTypes !== null &&
    !Array.isArray(commandOrTypeOrTypes)
  ) {
    const command = commandOrTypeOrTypes as T;
    const action: DispatchAction = {
      type: 'dispatch',
      command,
    };
    pendingDispatches.push(action);
    return action;
  }

  // String pattern for command type + data - return the command object for event handlers
  const commandType = commandOrTypeOrTypes as T['type'];
  const data = dataOrHandler as T['data'];

  const command = {
    type: commandType,
    data,
  } as T;

  // Return the command directly for event handlers to process
  return command;
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

/**
 * Generate pipeline graph from current registrations
 */
export function getPipelineGraph(metadataService?: CommandMetadataService): {
  nodes: Array<{
    id: string;
    title: string;
    alias?: string;
    description?: string;
    package?: string;
    version?: string;
    category?: string;
    icon?: string;
  }>;
  edges: Array<{ from: string; to: string }>;
} {
  const commandNodes = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  // Process event registrations to find command connections
  registrations.forEach((registration) => {
    if (registration.type === 'on') {
      processEventRegistration(registration, commandNodes, edges);
    }

    if (registration.type === 'on-settled') {
      processSettledRegistration(registration, commandNodes, edges);
    }
  });

  const nodes = Array.from(commandNodes).map((id) => {
    const baseNode = { id, title: id };

    if (metadataService) {
      const metadata = metadataService.getCommandMetadata(id);
      if (metadata) {
        return {
          ...baseNode,
          alias: metadata.alias,
          description: metadata.description,
          package: metadata.package,
          version: metadata.version,
          category: metadata.category,
          icon: metadata.icon ?? 'terminal',
        };
      }
    }

    return {
      ...baseNode,
      icon: 'terminal',
    };
  });

  return { nodes, edges };
}

function processEventRegistration(
  registration: EventRegistration,
  commandNodes: Set<string>,
  edges: Array<{ from: string; to: string }>,
): void {
  try {
    const mockEvent = { type: registration.eventType, data: {} } as Event;
    const result = registration.handler(mockEvent);

    if (result && typeof result === 'object' && 'type' in result) {
      addCommandAndEdge(result as Command, registration.eventType, commandNodes, edges);
    } else if (Array.isArray(result)) {
      result.forEach((command) => {
        if (command !== null && typeof command === 'object' && 'type' in command && typeof command.type === 'string') {
          addCommandAndEdge(command, registration.eventType, commandNodes, edges);
        }
      });
    }
  } catch {
    // Handler might require specific event data, skip if it fails
  }
}

function processSettledRegistration(
  registration: SettledRegistration,
  commandNodes: Set<string>,
  edges: Array<{ from: string; to: string }>,
): void {
  registration.commandTypes.forEach((commandType) => {
    commandNodes.add(commandType);
  });

  if (registration.dispatches && registration.dispatches.length > 0) {
    registration.dispatches.forEach((commandType) => {
      commandNodes.add(commandType);

      registration.commandTypes.forEach((settledCommand) => {
        edges.push({
          from: settledCommand,
          to: commandType,
        });
      });
    });
  }
}

function addCommandAndEdge(
  command: Command,
  eventType: string,
  commandNodes: Set<string>,
  edges: Array<{ from: string; to: string }>,
): void {
  commandNodes.add(command.type);

  const sourceCommand = inferSourceCommand(eventType);
  if (sourceCommand !== null) {
    commandNodes.add(sourceCommand);
    edges.push({
      from: sourceCommand,
      to: command.type,
    });
  }
}

/**
 * Infer source command from event name using naming patterns
 */
function inferSourceCommand(eventType: string): string | null {
  // Pattern: EventExported -> ExportEvent
  if (eventType.endsWith('Exported')) {
    return 'Export' + eventType.replace('Exported', '');
  }

  // Pattern: EventGenerated -> GenerateEvent
  if (eventType.endsWith('Generated')) {
    return 'Generate' + eventType.replace('Generated', '');
  }

  // Pattern: EventImplemented -> ImplementEvent
  if (eventType.endsWith('Implemented')) {
    return 'Implement' + eventType.replace('Implemented', '');
  }

  return null;
}
