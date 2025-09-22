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
import type { ILocalMessageStore } from '@auto-engineer/message-store';
import createDebug from 'debug';

const debug = createDebug('auto-engineer:dsl:pipeline-graph');

let registrations: DslRegistration[] = [];
let pendingDispatches: DispatchAction[] = [];

export type NodeStatus = 'None' | 'idle' | 'running' | 'pass' | 'fail';

function buildCommandEventMappings(metadataService?: CommandMetadataService): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};

  if (!metadataService) {
    return mappings;
  }

  const commands = metadataService.getAllCommandsMetadata();

  for (const command of commands) {
    const commandName = command.name;

    if (!commandName || typeof commandName !== 'string') {
      continue;
    }

    if (!command.events || command.events.length === 0) {
      continue;
    }

    mappings[commandName] = command.events;
  }

  return mappings;
}

export interface PipelineGraphConfig {
  metadataService?: CommandMetadataService;
  eventHandlers?: Map<string, Array<(event: Event) => void>>;
  messageStore?: ILocalMessageStore;
  dslRegistrations?: DslRegistration[];
}

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
 * Peek at registrations without clearing them
 */
export function peekRegistrations(): DslRegistration[] {
  return [...registrations];
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
 * Convert camelCase/PascalCase to title case with spaces
 * E.g., "GenerateServer" -> "Generate Server", "checkTypes" -> "Check Types", "GenerateHTML" -> "Generate HTML"
 */
function camelCaseToTitleCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (match) => match.toUpperCase())
    .trim();
}

export function buildEventToCommandMapping(metadataService?: CommandMetadataService): Record<string, string> {
  if (!metadataService) {
    return {};
  }

  // Use the dynamic mappings from the command metadata service
  const eventToCommandMap = (
    metadataService as CommandMetadataService & { getEventToCommandMapping?: () => Map<string, string> }
  ).getEventToCommandMapping?.();
  const result: Record<string, string> = {};

  if (eventToCommandMap instanceof Map) {
    for (const [eventType, commandName] of eventToCommandMap.entries()) {
      result[eventType] = commandName;
    }
  }

  debug('Built %d dynamic event-to-command mappings from metadata service', Object.keys(result).length);

  return result;
}

function getCommandFromEventType(eventType: string, metadataService?: CommandMetadataService): string | null {
  const eventToCommandMap = buildEventToCommandMapping(metadataService);
  return eventToCommandMap[eventType] || null;
}

/**
 * Calculate status for a pipeline node based on message store
 */
async function calculateNodeStatus(
  commandType: string,
  messageStore: ILocalMessageStore,
  metadataService?: CommandMetadataService,
): Promise<NodeStatus> {
  try {
    // Get all messages from the message store
    const allMessages = await messageStore.getAllMessages();

    // Find all commands for this command type
    const commands = allMessages
      .filter((msg) => msg.messageType === 'command' && msg.message.type === commandType)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (commands.length === 0) {
      return 'idle';
    }

    // Get the latest command
    const latestCommand = commands[commands.length - 1];

    const requestId = latestCommand.message.requestId;
    if (requestId === undefined || requestId === null || requestId === '') {
      throw new Error(`Command ${commandType} is missing requestId`);
    }

    const commandEventMappings = buildCommandEventMappings(metadataService);
    const commandEvents = commandEventMappings[commandType];
    if (commandEvents === undefined) {
      return 'None';
    }

    // Find events that match this command's requestId
    const relatedEvents = allMessages.filter(
      (msg) => msg.messageType === 'event' && msg.message.requestId === requestId,
    );

    if (relatedEvents.length === 0) {
      return 'running';
    }

    // Check if there's any completion event from this command's event list
    const hasCompletion = relatedEvents.some((event) => commandEvents.includes(event.message.type));
    if (!hasCompletion) {
      return 'running';
    }

    // Check if there's any failure event (any event with error/errors field)
    // This check must come AFTER completion check to ensure we have completed events
    // but takes precedence for determining final status
    const hasFailure = relatedEvents.some((event) => {
      const data = event.message.data;
      return data !== null && typeof data === 'object' && ('error' in data || 'errors' in data);
    });
    if (hasFailure) {
      return 'fail';
    }

    // If we have completion events but no failures, it's a pass
    return 'pass';
  } catch (error) {
    debug('Error calculating node status for %s: %O', commandType, error);
    throw error;
  }
}

/**
 * Generate pipeline graph from current registrations
 */
export async function getPipelineGraph(config: PipelineGraphConfig = {}): Promise<{
  commandToEvents: Record<string, string[]>;
  eventToCommand: Record<string, string>;
  nodes: Array<{
    id: string;
    name: string;
    title: string;
    alias?: string;
    description?: string;
    package?: string;
    version?: string;
    category?: string;
    icon?: string;
    status: NodeStatus;
  }>;
  edges: Array<{ from: string; to: string }>;
}> {
  const { metadataService, eventHandlers, messageStore, dslRegistrations } = config;
  const commandNodes = new Set<string>();
  const edges: Array<{ from: string; to: string }> = [];

  debug(
    'Called with metadataService=%s eventHandlers=%s eventHandlers size=%s messageStore=%s dslRegistrations=%s',
    !!metadataService,
    !!eventHandlers,
    eventHandlers?.size,
    !!messageStore,
    dslRegistrations?.length ?? 0,
  );

  // If eventHandlers are provided, use them instead of DSL registrations
  if (eventHandlers) {
    debug('Using event handlers, found %d handlers', eventHandlers.size);
    // For now, we need to reconstruct the pipeline from the event handlers
    // This is a simplified approach that may need enhancement
    for (const [eventType, handlers] of eventHandlers) {
      debug('Processing event type %s with %d handlers', eventType, handlers.length);
      // Extract command relationships from event type names
      // This is based on the naming convention in auto.config.ts
      const sourceCommand = getCommandFromEventType(eventType, metadataService);
      debug('Source command for %s = %s', eventType, sourceCommand);
      if (sourceCommand !== null && sourceCommand !== '') {
        commandNodes.add(sourceCommand);

        // We can't determine target commands from event handlers without analyzing their dispatch calls
        // The eventHandlers approach is fundamentally broken for pipeline graph generation
        // Only the DSL registrations path should be used
        debug('Warning: eventHandlers path cannot determine target commands - skipping edge creation');
      }
    }
    debug('Final nodes: %o', Array.from(commandNodes));
    debug('Final edges: %o', edges);
  } else {
    // Use DSL registrations (either passed in or from global state)
    const regsToProcess = dslRegistrations || registrations;
    debug('Using DSL registrations, found %d registrations', regsToProcess.length);

    regsToProcess.forEach((registration) => {
      if (registration.type === 'on') {
        processEventRegistration(registration, commandNodes, edges, metadataService);
      }

      if (registration.type === 'on-settled') {
        processSettledRegistration(registration, commandNodes, edges, metadataService);
      }
    });
  }

  const nodes = await Promise.all(
    Array.from(commandNodes).map(async (commandType) => {
      const baseNode = {
        id: commandType,
        name: commandType,
        title: camelCaseToTitleCase(commandType),
      };

      let status: NodeStatus = 'None';
      if (messageStore) {
        status = await calculateNodeStatus(commandType, messageStore, metadataService);
      }

      if (metadataService) {
        const metadata = metadataService.getCommandMetadata(commandType);
        if (metadata) {
          return {
            ...baseNode,
            id: `${metadata.package}/${metadata.alias}`,
            title: camelCaseToTitleCase(commandType),
            alias: metadata.alias,
            description: metadata.description,
            package: metadata.package,
            version: metadata.version,
            category: metadata.category,
            icon: metadata.icon ?? 'terminal',
            status,
          };
        }
      }

      return {
        ...baseNode,
        icon: 'terminal',
        status,
      };
    }),
  );

  const commandToEvents = buildCommandEventMappings(metadataService);
  const eventToCommand = buildEventToCommandMapping(metadataService);

  return { nodes, edges, commandToEvents, eventToCommand };
}

function processEventRegistration(
  registration: EventRegistration,
  commandNodes: Set<string>,
  edges: Array<{ from: string; to: string }>,
  metadataService?: CommandMetadataService,
): void {
  try {
    const mockEvent = { type: registration.eventType, data: {} } as Event;
    const result = registration.handler(mockEvent);

    if (result && typeof result === 'object' && 'type' in result) {
      addCommandAndEdge(result as Command, registration.eventType, commandNodes, edges, metadataService);
    } else if (Array.isArray(result)) {
      result.forEach((command) => {
        if (command !== null && typeof command === 'object' && 'type' in command && typeof command.type === 'string') {
          addCommandAndEdge(command, registration.eventType, commandNodes, edges, metadataService);
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
  metadataService?: CommandMetadataService,
): void {
  function getNodeId(commandType: string): string {
    if (metadataService) {
      const metadata = metadataService.getCommandMetadata(commandType);
      if (metadata) {
        return `${metadata.package}/${metadata.alias}`;
      }
    }
    return commandType;
  }

  registration.commandTypes.forEach((commandType) => {
    commandNodes.add(commandType);
  });

  if (registration.dispatches && registration.dispatches.length > 0) {
    registration.dispatches.forEach((commandType) => {
      commandNodes.add(commandType);

      registration.commandTypes.forEach((settledCommand) => {
        edges.push({
          from: getNodeId(settledCommand),
          to: getNodeId(commandType),
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
  metadataService?: CommandMetadataService,
): void {
  function getNodeId(commandType: string): string {
    if (metadataService) {
      const metadata = metadataService.getCommandMetadata(commandType);
      if (metadata) {
        return `${metadata.package}/${metadata.alias}`;
      }
    }
    return commandType;
  }

  commandNodes.add(command.type);

  const eventToCommandMap = buildEventToCommandMapping(metadataService);
  const sourceCommand = eventToCommandMap[eventType];
  if (sourceCommand !== undefined) {
    commandNodes.add(sourceCommand);
    edges.push({
      from: getNodeId(sourceCommand),
      to: getNodeId(command.type),
    });
  }
}
