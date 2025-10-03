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

interface SettledHandlerTemplate {
  id: string;
  registration: SettledRegistration;
}

interface SettledHandlerInstance {
  templateId: string;
  correlationId: string;
  registration: SettledRegistration;
  commandTrackers: Map<string, CommandTracker>;
}

export class SettledTracker {
  private handlerTemplates: Map<string, SettledHandlerTemplate> = new Map();
  private handlerInstances: Map<string, SettledHandlerInstance> = new Map();
  private commandToHandlerIds: Map<string, Set<string>> = new Map();
  private runningCommands: Map<string, { commandType: string; correlationId: string }> = new Map();
  private onDispatchAction?: (action: DispatchAction, parentCorrelationId?: string) => void;
  private metadataService?: CommandMetadataService;
  private eventToCommandMapping: Record<string, string> = {};

  constructor(
    onDispatchAction?: (action: DispatchAction, parentCorrelationId?: string) => void,
    metadataService?: CommandMetadataService,
  ) {
    this.onDispatchAction = onDispatchAction;
    this.metadataService = metadataService;
    this.eventToCommandMapping = buildEventToCommandMapping(metadataService);
  }

  registerSettledHandler(registration: SettledRegistration): void {
    const templateId = this.generateTemplateId(registration);
    debug('Registering settled handler template:', templateId, 'for commands:', registration.commandTypes);

    this.handlerTemplates.set(templateId, {
      id: templateId,
      registration,
    });

    // Track which command types this template is interested in
    for (const commandType of registration.commandTypes) {
      if (!this.commandToHandlerIds.has(commandType)) {
        this.commandToHandlerIds.set(commandType, new Set());
      }
      this.commandToHandlerIds.get(commandType)!.add(templateId);
    }
  }

  private instantiateHandlerForCorrelation(template: SettledHandlerTemplate, correlationId: string): void {
    const instanceId = this.generateInstanceId(template.id, correlationId);

    if (this.handlerInstances.has(instanceId)) {
      return;
    }

    debug('Instantiating settled handler for correlationId:', correlationId, 'template:', template.id);

    const commandTrackers = new Map<string, CommandTracker>();
    for (const commandType of template.registration.commandTypes) {
      commandTrackers.set(commandType, {
        commandType,
        hasCompleted: false,
        events: [],
      });
    }

    this.handlerInstances.set(instanceId, {
      templateId: template.id,
      correlationId,
      registration: template.registration,
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
    debug('Started tracking command:', commandType, 'with requestId:', requestId, 'correlationId:', correlationId);

    // Instantiate handlers for this correlationId if needed
    const templateIds = this.commandToHandlerIds.get(commandType);
    if (templateIds) {
      for (const templateId of templateIds) {
        const template = this.handlerTemplates.get(templateId);
        if (template) {
          this.instantiateHandlerForCorrelation(template, correlationId);
        }
      }
    }
  }

  onEventReceived(event: Event): void {
    const eventCorrelationId = event.correlationId;
    debug('Received event:', event.type, 'with correlationId:', eventCorrelationId);

    if (eventCorrelationId === undefined || eventCorrelationId === null || eventCorrelationId === '') {
      debug('Event missing correlationId, cannot route:', event.type);
      return;
    }

    // Route event to handler instances matching this correlationId
    for (const [instanceId, instance] of this.handlerInstances) {
      if (instance.correlationId !== eventCorrelationId) {
        continue;
      }

      for (const [commandType, tracker] of instance.commandTrackers) {
        if (tracker.hasCompleted) continue;

        // Check if this event is related to this command type
        if (this.isEventFromCommand(event.type, commandType)) {
          debug('Event', event.type, 'is related to command', commandType, 'for instance', instanceId);

          // Always add related events to the tracker
          tracker.events.push(event);

          // Only mark as completed if this is a completion event
          if (this.isCompletionEvent(event.type)) {
            tracker.hasCompleted = true;
            debug('Marked command', commandType, 'as completed for instance', instanceId);

            // Check if all commands for this instance have completed
            this.checkAndTriggerHandlerInstance(instanceId, instance);
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

  private collectEventsByCommandType(instance: SettledHandlerInstance): Record<string, Event[]> {
    const eventsByCommandType: Record<string, Event[]> = {};
    for (const [commandType, tracker] of instance.commandTrackers) {
      eventsByCommandType[commandType] = [...tracker.events];
    }
    return eventsByCommandType;
  }

  private processPendingDispatches(parentCorrelationId: string): void {
    const pendingDispatches = getPendingDispatches();
    debug('Found %d pending dispatches after handler execution', pendingDispatches.length);
    if (pendingDispatches.length > 0 && this.onDispatchAction) {
      for (const action of pendingDispatches) {
        debug('Processing pending dispatch action:', action.type);
        this.onDispatchAction(action, parentCorrelationId);
      }
    }
  }

  private shouldPersistHandler(result: void | { persist: boolean }): boolean {
    return (
      result !== null &&
      result !== undefined &&
      typeof result === 'object' &&
      'persist' in result &&
      result.persist === true
    );
  }

  private resetHandlerTrackers(instance: SettledHandlerInstance): void {
    for (const tracker of instance.commandTrackers.values()) {
      tracker.hasCompleted = false;
      tracker.events = [];
    }
  }

  private checkAndTriggerHandlerInstance(instanceId: string, instance: SettledHandlerInstance): void {
    const allCompleted = Array.from(instance.commandTrackers.values()).every((tracker) => tracker.hasCompleted);

    if (!allCompleted) {
      debug('Instance', instanceId, 'not ready yet - waiting for more commands to complete');
      return;
    }

    debug('All commands completed for instance', instanceId, '- triggering settled handler');

    const eventsByCommandType = this.collectEventsByCommandType(instance);

    try {
      debug('Executing settled handler with events:', Object.keys(eventsByCommandType));
      const result = instance.registration.handler(eventsByCommandType);

      this.processPendingDispatches(instance.correlationId);

      if (this.shouldPersistHandler(result)) {
        debug('Persisting settled handler instance for retry:', instanceId);
        this.resetHandlerTrackers(instance);
      } else {
        debug('Cleaning up settled handler instance:', instanceId);
        this.cleanupHandlerInstance(instanceId);
      }
    } catch (error) {
      debug('Error executing settled handler instance', instanceId, ':', error);
      this.cleanupHandlerInstance(instanceId);
    }
  }

  private cleanupHandlerInstance(instanceId: string): void {
    const instance = this.handlerInstances.get(instanceId);
    if (!instance) return;

    this.handlerInstances.delete(instanceId);
    debug('Cleaned up settled handler instance:', instanceId);
  }

  private generateTemplateId(registration: SettledRegistration): string {
    const commandTypes = registration.commandTypes.join(',');
    return `template-${commandTypes}`;
  }

  private generateInstanceId(templateId: string, correlationId: string): string {
    return `${templateId}-${correlationId}`;
  }

  getActiveHandlers(): string[] {
    return Array.from(this.handlerInstances.keys());
  }
}
