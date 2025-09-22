import type { Event, Command } from '@auto-engineer/message-bus';
import type { SettledRegistration, DispatchAction } from '../dsl/types';
import { getPendingDispatches } from '../dsl';
import { buildEventToCommandMapping } from '../dsl';
import type { CommandMetadataService } from './command-metadata-service';
import createDebug from 'debug';

const debug = createDebug('auto-engineer:server:settled-tracker');

interface CommandTracker {
  commandType: string;
  hasCompleted: boolean;
  events: Event[];
}

interface SettledHandler {
  registration: SettledRegistration;
  commandTrackers: Map<string, CommandTracker>;
}

export class SettledTracker {
  private settledHandlers: Map<string, SettledHandler> = new Map();
  private commandToHandlerIds: Map<string, Set<string>> = new Map();
  private runningCommands: Map<string, { commandType: string; correlationId: string }> = new Map();
  private onDispatchAction?: (action: DispatchAction) => void;
  private metadataService?: CommandMetadataService;
  private eventToCommandMapping: Record<string, string> = {};

  constructor(onDispatchAction?: (action: DispatchAction) => void, metadataService?: CommandMetadataService) {
    this.onDispatchAction = onDispatchAction;
    this.metadataService = metadataService;
    this.eventToCommandMapping = buildEventToCommandMapping(metadataService);
  }

  registerSettledHandler(registration: SettledRegistration): void {
    const handlerId = this.generateHandlerId(registration);
    debug('Registering settled handler:', handlerId, 'for commands:', registration.commandTypes);

    const commandTrackers = new Map<string, CommandTracker>();

    for (const commandType of registration.commandTypes) {
      commandTrackers.set(commandType, {
        commandType,
        hasCompleted: false,
        events: [],
      });

      // Track which handlers are interested in this command type
      if (!this.commandToHandlerIds.has(commandType)) {
        this.commandToHandlerIds.set(commandType, new Set());
      }
      this.commandToHandlerIds.get(commandType)!.add(handlerId);
    }

    this.settledHandlers.set(handlerId, {
      registration,
      commandTrackers,
    });
  }

  onCommandStarted(command: Command): void {
    const { type: commandType, correlationId, requestId } = command;

    if (
      correlationId === undefined ||
      correlationId === null ||
      correlationId === '' ||
      requestId === undefined ||
      requestId === null ||
      requestId === ''
    ) {
      debug('Command missing correlation/request ID, cannot track:', commandType);
      return;
    }

    // Track this command execution
    this.runningCommands.set(requestId, { commandType, correlationId });
    debug('Started tracking command:', commandType, 'with requestId:', requestId);
  }

  onEventReceived(event: Event): void {
    debug('Received event:', event.type);

    // For each settled handler, check if this event indicates completion of any tracked commands
    for (const [handlerId, handler] of this.settledHandlers) {
      for (const [commandType, tracker] of handler.commandTrackers) {
        if (tracker.hasCompleted) continue;

        // Check if this event is related to this command type
        if (this.isEventFromCommand(event.type, commandType)) {
          debug('Event', event.type, 'is related to command', commandType);

          // Always add related events to the tracker
          tracker.events.push(event);

          // Only mark as completed if this is a completion event
          if (this.isCompletionEvent(event.type)) {
            tracker.hasCompleted = true;
            debug('Marked command', commandType, 'as completed for handler', handlerId);

            // Check if all commands for this handler have completed
            this.checkAndTriggerHandler(handlerId, handler);
          } else {
            debug('Event', event.type, 'is progress for command', commandType, '- not marking as completed yet');
          }
        }
      }
    }
  }

  private isEventFromCommand(eventType: string, commandType: string): boolean {
    // Get fresh mapping in case new handlers have been registered
    const currentMapping = buildEventToCommandMapping(this.metadataService);
    const sourceCommand = currentMapping[eventType];
    return sourceCommand === commandType;
  }

  private isCompletionEvent(eventType: string): boolean {
    // Get fresh mapping in case new handlers have been registered
    const currentMapping = buildEventToCommandMapping(this.metadataService);

    if (currentMapping[eventType] !== undefined) {
      return true;
    }

    if (this.metadataService) {
      const commands = this.metadataService.getAllCommandsMetadata();
      return commands.some((command) => command.events?.includes(eventType) ?? false);
    }

    return false;
  }

  private checkAndTriggerHandler(handlerId: string, handler: SettledHandler): void {
    const allCompleted = Array.from(handler.commandTrackers.values()).every((tracker) => tracker.hasCompleted);

    if (!allCompleted) {
      debug('Handler', handlerId, 'not ready yet - waiting for more commands to complete');
      return;
    }

    debug('All commands completed for handler', handlerId, '- triggering settled handler');

    // Collect all events grouped by command type
    const eventsByCommandType: Record<string, Event[]> = {};
    for (const [commandType, tracker] of handler.commandTrackers) {
      eventsByCommandType[commandType] = [...tracker.events];
    }

    try {
      // Execute the handler (DSL already handles enhanced API wrapping)
      debug('Executing settled handler with events:', Object.keys(eventsByCommandType));
      handler.registration.handler(eventsByCommandType);

      // Check for any pending dispatches created by the handler
      const pendingDispatches = getPendingDispatches();
      debug('Found %d pending dispatches after handler execution', pendingDispatches.length);
      if (pendingDispatches.length > 0 && this.onDispatchAction) {
        for (const action of pendingDispatches) {
          debug('Processing pending dispatch action:', action.type);
          this.onDispatchAction(action);
        }
      }

      debug('Settled handler', handlerId, 'executed successfully');
    } catch (error) {
      debug('Error executing settled handler', handlerId, ':', error);
    }

    // Clean up this handler since it has been triggered
    this.cleanupHandler(handlerId);
  }

  private cleanupHandler(handlerId: string): void {
    const handler = this.settledHandlers.get(handlerId);
    if (!handler) return;

    // Remove handler from command type mappings
    for (const commandType of handler.registration.commandTypes) {
      const handlerIds = this.commandToHandlerIds.get(commandType);
      if (handlerIds) {
        handlerIds.delete(handlerId);
        if (handlerIds.size === 0) {
          this.commandToHandlerIds.delete(commandType);
        }
      }
    }

    // Remove the handler itself
    this.settledHandlers.delete(handlerId);
    debug('Cleaned up settled handler:', handlerId);
  }

  private generateHandlerId(registration: SettledRegistration): string {
    const commandTypes = registration.commandTypes.join(',');
    const timestamp = Date.now();
    return `settled-${commandTypes}-${timestamp}`;
  }

  getActiveHandlers(): string[] {
    return Array.from(this.settledHandlers.keys());
  }
}
