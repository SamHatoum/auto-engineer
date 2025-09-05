import type { MessageBus, Event, Command } from '@auto-engineer/message-bus';
import type { StateManager } from './state-manager';
import type { EventRegistration, DispatchAction } from '../dsl/types';
import createDebug from 'debug';

const debugBus = createDebug('auto-engineer:server:bus');

export class EventProcessor {
  private eventHandlers: Map<string, Array<(event: Event) => void>> = new Map();
  private eventHistory: Array<{ event: Event; timestamp: string }> = [];
  private readonly maxEventHistory = 1000;

  constructor(
    private messageBus: MessageBus,
    private stateManager: StateManager<Record<string, unknown>>,
    private onEventBroadcast: (event: Event) => void,
  ) {}

  setupGlobalEventListener(): void {
    this.messageBus.subscribeAll({
      name: 'ServerStateManager',
      handle: async (event: Event) => {
        debugBus('Received event:', event.type);

        // Store event in history
        this.eventHistory.push({
          event,
          timestamp: new Date().toISOString(),
        });

        // Trim history if it exceeds max size
        if (this.eventHistory.length > this.maxEventHistory) {
          this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
        }

        // Apply event to state
        this.stateManager.applyEvent(event);

        // Trigger registered event handlers
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

        // Broadcast event to WebSocket clients
        this.onEventBroadcast(event);
        debugBus('Broadcasted event to clients:', event.type);
      },
    });
  }

  registerEventHandler(registration: EventRegistration): void {
    debugBus('Registering event handler for:', registration.eventType);

    const handler = (event: Event) => {
      (async () => {
        try {
          const result = registration.handler(event);
          await this.processHandlerResult(result);
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

  private async processHandlerResult(result: unknown): Promise<void> {
    if (result === null || result === undefined) return;

    if (Array.isArray(result)) {
      await this.processCommandArray(result);
    } else if (typeof result === 'object' && result !== null && 'type' in result) {
      await this.processActionOrCommand(result);
    }
  }

  private async processCommandArray(commands: unknown[]): Promise<void> {
    debugBus('Dispatching multiple commands from event handler');
    for (const command of commands) {
      if (
        command !== null &&
        command !== undefined &&
        typeof command === 'object' &&
        'type' in command &&
        'data' in command
      ) {
        debugBus('Dispatching command:', (command as Command).type);
        await this.messageBus.sendCommand(command as Command);
      }
    }
  }

  private async processActionOrCommand(action: unknown): Promise<void> {
    const actionObj = action as Record<string, unknown>;
    if (actionObj !== null && typeof actionObj === 'object' && 'data' in actionObj) {
      debugBus('Dispatching command from event handler:', (action as Command).type);
      await this.messageBus.sendCommand(action as Command);
    } else {
      await this.processDispatchAction(action as DispatchAction);
    }
  }

  private async processDispatchAction(action: DispatchAction): Promise<void> {
    switch (action.type) {
      case 'dispatch':
        await this.handleSingleDispatch(action);
        break;
      case 'dispatch-parallel':
        await this.handleParallelDispatch(action);
        break;
      case 'dispatch-sequence':
        await this.handleSequentialDispatch(action);
        break;
      case 'dispatch-custom':
        await this.handleCustomDispatch(action);
        break;
    }
  }

  private async handleSingleDispatch(action: DispatchAction): Promise<void> {
    if (action.command) {
      debugBus('Dispatching command from dispatch action:', action.command.type);
      await this.messageBus.sendCommand(action.command);
    }
  }

  private async handleParallelDispatch(action: DispatchAction): Promise<void> {
    if (action.commands) {
      debugBus('Dispatching parallel commands from event handler');
      await Promise.all(action.commands.map((cmd) => this.messageBus.sendCommand(cmd)));
    }
  }

  private async handleSequentialDispatch(action: DispatchAction): Promise<void> {
    if (action.commands) {
      debugBus('Dispatching sequential commands from event handler');
      for (const cmd of action.commands) {
        await this.messageBus.sendCommand(cmd);
      }
    }
  }

  private async handleCustomDispatch(action: DispatchAction): Promise<void> {
    if (action.commandFactory) {
      const cmds = action.commandFactory();
      const commands = Array.isArray(cmds) ? cmds : [cmds];
      for (const cmd of commands) {
        await this.messageBus.sendCommand(cmd);
      }
    }
  }

  getEventHandlers(): Map<string, Array<(event: Event) => void>> {
    return this.eventHandlers;
  }

  getEventHistory(): Array<{ event: Event; timestamp: string }> {
    return this.eventHistory;
  }

  clearEventHistory(): void {
    this.eventHistory = [];
  }
}
