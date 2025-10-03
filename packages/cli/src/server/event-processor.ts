import type { MessageBus, Event, Command } from '@auto-engineer/message-bus';
import type { IMessageStore } from '@auto-engineer/message-store';
import type { StateManager } from './state-manager';
import type { EventRegistration, DispatchAction } from '../dsl/types';
import type { SettledTracker } from './settled-tracker';
import { nanoid } from 'nanoid';
import { generateChildCorrelationId, generateCorrelationId } from '../utils/correlation-id';
import createDebug from 'debug';

const debugBus = createDebug('auto-engineer:server:bus');

export class EventProcessor {
  private eventHandlers: Map<string, Array<(event: Event) => void>> = new Map();
  private correlationContext: Map<string, string> = new Map(); // requestId -> correlationId mapping

  constructor(
    private messageBus: MessageBus,
    private messageStore: IMessageStore,
    private stateManager: StateManager<Record<string, unknown>>,
    private onEventBroadcast: (event: Event) => void,
    private settledTracker?: SettledTracker,
  ) {}

  setupGlobalEventListener(): void {
    this.messageBus.subscribeAll({
      name: 'ServerStateManager',
      handle: async (event: Event) => {
        debugBus('Received event:', event.type, JSON.stringify(event));

        await this.storeEvent(event);
        this.stateManager.applyEvent(event);
        this.notifySettledTrackerOfEvent(event);
        this.attachChildCorrelationIdToEvent(event);
        this.triggerEventHandlers(event);

        this.onEventBroadcast(event);
        debugBus('Broadcasted event to clients:', event.type);
      },
    });
  }

  private async storeEvent(event: Event): Promise<void> {
    try {
      await this.messageStore.saveMessages('$all', [event], undefined, 'event');
      debugBus('Event stored in message store:', event.type);
    } catch (error) {
      debugBus('Error storing event:', error);
    }
  }

  private notifySettledTrackerOfEvent(event: Event): void {
    if (this.settledTracker) {
      this.settledTracker.onEventReceived(event);
    }
  }

  private attachChildCorrelationIdToEvent(event: Event): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    if (
      handlers.length > 0 &&
      event.correlationId !== undefined &&
      event.correlationId !== null &&
      event.correlationId !== ''
    ) {
      const childCorrelationId = generateChildCorrelationId(event.correlationId);
      (event as Event & { _frameworkChildCorrelationId?: string })._frameworkChildCorrelationId = childCorrelationId;
      debugBus('Generated child correlationId for event:', childCorrelationId);
    }
  }

  private triggerEventHandlers(event: Event): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
        if (!isTest) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
        debugBus('Event handler error (suppressed in tests):', error);
      }
    }
  }

  registerEventHandler(registration: EventRegistration): void {
    debugBus('Registering event handler for:', registration.eventType);

    const handler = (event: Event) => {
      (async () => {
        try {
          const result = registration.handler(event);
          const eventWithChild = event as Event & { _frameworkChildCorrelationId?: string };
          const correlationId =
            eventWithChild._frameworkChildCorrelationId !== undefined &&
            eventWithChild._frameworkChildCorrelationId !== null &&
            eventWithChild._frameworkChildCorrelationId !== ''
              ? eventWithChild._frameworkChildCorrelationId
              : event.correlationId;
          await this.processHandlerResult(result, correlationId);
        } catch (error) {
          const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
          if (!isTest) {
            console.error('Error in event handler:', error);
          }
          debugBus('Event handler error (suppressed in tests):', error);
        }
      })().catch((error) => {
        const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
        if (!isTest) {
          console.error('Unhandled error in event handler:', error);
        }
        debugBus('Unhandled event handler error (suppressed in tests):', error);
      });
    };

    // Store handler for later execution
    if (!this.eventHandlers.has(registration.eventType)) {
      this.eventHandlers.set(registration.eventType, []);
    }
    this.eventHandlers.get(registration.eventType)!.push(handler);
  }

  private async processHandlerResult(result: unknown, parentCorrelationId?: string): Promise<void> {
    if (result === null || result === undefined) return;

    if (Array.isArray(result)) {
      await this.processCommandArray(result, parentCorrelationId);
    } else if (typeof result === 'object' && result !== null && 'type' in result) {
      await this.processActionOrCommand(result, parentCorrelationId);
    }
  }

  private async processCommandArray(commands: unknown[], parentCorrelationId?: string): Promise<void> {
    debugBus('Dispatching multiple commands from event handler');
    for (const command of commands) {
      if (
        command !== null &&
        command !== undefined &&
        typeof command === 'object' &&
        'type' in command &&
        'data' in command
      ) {
        const cmd = command as Command;
        const cmdWithCorrelation = this.maybeInheritCorrelationId(cmd, parentCorrelationId);
        const enhancedCommand = this.enhanceCommandWithIds(cmdWithCorrelation, parentCorrelationId);
        debugBus('Dispatching command:', enhancedCommand.type);
        await this.storeCommand(enhancedCommand);
        await this.messageBus.sendCommand(enhancedCommand);
      }
    }
  }

  private async processActionOrCommand(action: unknown, parentCorrelationId?: string): Promise<void> {
    const actionObj = action as Record<string, unknown>;
    if (actionObj !== null && typeof actionObj === 'object' && 'data' in actionObj) {
      const cmd = action as Command;
      const cmdWithCorrelation = this.maybeInheritCorrelationId(cmd, parentCorrelationId);
      const enhancedCommand = this.enhanceCommandWithIds(cmdWithCorrelation, parentCorrelationId);
      debugBus('Dispatching command from event handler:', enhancedCommand.type);
      await this.storeCommand(enhancedCommand);
      await this.messageBus.sendCommand(enhancedCommand);
    } else {
      await this.processDispatchAction(action as DispatchAction, parentCorrelationId);
    }
  }

  private maybeInheritCorrelationId(cmd: Command, parentCorrelationId?: string): Command {
    const shouldInherit =
      parentCorrelationId !== undefined &&
      parentCorrelationId !== null &&
      parentCorrelationId !== '' &&
      (cmd.correlationId === undefined || cmd.correlationId === null || cmd.correlationId === '');

    return shouldInherit ? { ...cmd, correlationId: parentCorrelationId } : cmd;
  }

  async processDispatchAction(action: DispatchAction, parentCorrelationId?: string): Promise<void> {
    switch (action.type) {
      case 'dispatch':
        await this.handleSingleDispatch(action, parentCorrelationId);
        break;
      case 'dispatch-parallel':
        await this.handleParallelDispatch(action, parentCorrelationId);
        break;
      case 'dispatch-sequence':
        await this.handleSequentialDispatch(action, parentCorrelationId);
        break;
      case 'dispatch-custom':
        await this.handleCustomDispatch(action, parentCorrelationId);
        break;
    }
  }

  private async handleSingleDispatch(action: DispatchAction, parentCorrelationId?: string): Promise<void> {
    if (action.command) {
      const enhancedCommand = this.enhanceCommandWithIds(action.command, parentCorrelationId);
      debugBus('Dispatching command from dispatch action:', enhancedCommand.type);
      await this.storeCommand(enhancedCommand);
      await this.messageBus.sendCommand(enhancedCommand);
    }
  }

  private async handleParallelDispatch(action: DispatchAction, parentCorrelationId?: string): Promise<void> {
    if (action.commands) {
      debugBus('Dispatching parallel commands from event handler');
      const enhancedCommands = action.commands.map((cmd) => this.enhanceCommandWithIds(cmd, parentCorrelationId));
      await Promise.all(
        enhancedCommands.map(async (cmd) => {
          await this.storeCommand(cmd);
          await this.messageBus.sendCommand(cmd);
        }),
      );
    }
  }

  private async handleSequentialDispatch(action: DispatchAction, parentCorrelationId?: string): Promise<void> {
    if (action.commands) {
      debugBus('Dispatching sequential commands from event handler');
      for (const cmd of action.commands) {
        const enhancedCommand = this.enhanceCommandWithIds(cmd, parentCorrelationId);
        await this.storeCommand(enhancedCommand);
        await this.messageBus.sendCommand(enhancedCommand);
      }
    }
  }

  private async handleCustomDispatch(action: DispatchAction, parentCorrelationId?: string): Promise<void> {
    if (action.commandFactory) {
      const cmds = action.commandFactory();
      const commands = Array.isArray(cmds) ? cmds : [cmds];
      for (const cmd of commands) {
        const enhancedCommand = this.enhanceCommandWithIds(cmd, parentCorrelationId);
        await this.storeCommand(enhancedCommand);
        await this.messageBus.sendCommand(enhancedCommand);
      }
    }
  }

  getEventHandlers(): Map<string, Array<(event: Event) => void>> {
    return this.eventHandlers;
  }

  /**
   * Store a command in the message store
   */
  async storeCommand(command: Command): Promise<void> {
    try {
      const enhancedCommand = this.enhanceCommandWithIds(command, undefined);
      await this.messageStore.saveMessages('$all', [enhancedCommand], undefined, 'command');

      // Notify settled tracker that command started
      if (this.settledTracker) {
        this.settledTracker.onCommandStarted(enhancedCommand);
      }

      // Store correlation context for this command's potential events
      if (
        enhancedCommand.requestId !== undefined &&
        enhancedCommand.requestId !== null &&
        enhancedCommand.requestId !== '' &&
        enhancedCommand.correlationId !== undefined &&
        enhancedCommand.correlationId !== null &&
        enhancedCommand.correlationId !== ''
      ) {
        this.correlationContext.set(enhancedCommand.requestId, enhancedCommand.correlationId);
        this.cleanupCorrelationContext();
      }

      debugBus('Command stored in message store:', enhancedCommand.type);
    } catch (error) {
      debugBus('Error storing command:', error);
    }
  }

  private enhanceCommandWithIds(command: Command, parentCorrelationId?: string): Command {
    const now = new Date();

    const requestId = command.requestId ?? `req-${Date.now()}-${nanoid(8)}`;

    let correlationId = command.correlationId;

    if (correlationId === undefined || correlationId === null || correlationId === '') {
      if (parentCorrelationId !== undefined && parentCorrelationId !== null && parentCorrelationId !== '') {
        correlationId = generateChildCorrelationId(parentCorrelationId);
      } else {
        const inheritedCorrelationId = this.findInheritedCorrelationId(command);
        correlationId = inheritedCorrelationId ?? generateCorrelationId();
      }
    }

    return {
      ...command,
      requestId,
      correlationId,
      timestamp: command.timestamp || now,
    };
  }

  /**
   * Try to find a correlation ID to inherit from the current context
   */
  private findInheritedCorrelationId(_command: Command): string | undefined {
    // This is a simplified implementation - in a more sophisticated system,
    // you might use async context tracking or other mechanisms

    // For now, try to find the most recent correlation ID from the context map
    const contextEntries = Array.from(this.correlationContext.entries());
    if (contextEntries.length > 0) {
      // Return the most recently stored correlation ID
      return contextEntries[contextEntries.length - 1][1];
    }

    return undefined;
  }

  /**
   * Clear correlation context periodically to prevent memory leaks
   */
  private cleanupCorrelationContext(): void {
    // Keep only the last 1000 entries
    if (this.correlationContext.size > 1000) {
      const entries = Array.from(this.correlationContext.entries());
      this.correlationContext.clear();

      // Keep the last 500 entries
      entries.slice(-500).forEach(([requestId, correlationId]) => {
        this.correlationContext.set(requestId, correlationId);
      });
    }
  }
}
