import { Command, Event, CommandHandler, EventHandler, EventSubscription } from './types';
import createDebug from 'debug';

const debug = createDebug('auto:message-bus');
const debugCommand = createDebug('auto:message-bus:command');
const debugEvent = createDebug('auto:message-bus:event');
const debugHandler = createDebug('auto:message-bus:handler');

// Set non-error-like colors for debug namespaces
// Colors: 0=gray, 1=red, 2=green, 3=yellow, 4=blue, 5=magenta, 6=cyan
debug.color = '6'; // cyan
debugCommand.color = '4'; // blue
debugEvent.color = '2'; // green
debugHandler.color = '6'; // cyan

type MessageBusState = {
  commandHandlers: Record<string, CommandHandler>;
  eventHandlers: Record<string, EventHandler[]>;
  allEventHandlers: EventHandler[]; // Handlers that receive ALL events
};

// DSL functions moved to CLI package

export function createMessageBus() {
  debug('Creating new message bus instance');
  const state: MessageBusState = {
    commandHandlers: {},
    eventHandlers: {},
    allEventHandlers: [],
  };
  debug('Message bus state initialized');

  function registerCommandHandler<TCommand extends Command>(commandHandler: CommandHandler<TCommand>): void {
    debugHandler('Registering command handler: %s', commandHandler.name);

    if (state.commandHandlers[commandHandler.name] !== undefined) {
      const error = `Command handler already registered for command: ${commandHandler.name}`;
      debugHandler('ERROR: %s', error);
      throw new Error(error);
    }

    state.commandHandlers[commandHandler.name] = commandHandler as CommandHandler;
    debugHandler('Handler registered successfully, total handlers: %d', Object.keys(state.commandHandlers).length);
  }

  async function sendCommand<TCommand extends Command>(command: TCommand): Promise<void> {
    logCommand(command);

    const commandHandler = findCommandHandler(command.type);

    await executeCommandHandler(commandHandler, command);
  }

  function logCommand<TCommand extends Command>(command: TCommand): void {
    debugCommand('Sending command: %s', command.type);
    debugCommand('  Request ID: %s', command.requestId ?? 'none');
    debugCommand('  Correlation ID: %s', command.correlationId ?? 'none');
    debugCommand('  Data keys: %o', Object.keys(command.data));
  }

  function findCommandHandler(commandType: string): CommandHandler {
    const commandHandler = state.commandHandlers[commandType];
    if (commandHandler === undefined) {
      debugCommand('ERROR: No handler found for command: %s', commandType);
      debugCommand('Available handlers: %o', Object.keys(state.commandHandlers));
      throw new Error(`Command handler not found for command: ${commandType}`);
    }

    debugCommand('Handler found for command: %s', commandType);
    return commandHandler;
  }

  async function executeCommandHandler<TCommand extends Command>(
    commandHandler: CommandHandler,
    command: TCommand,
  ): Promise<void> {
    try {
      debugCommand('Executing handler for: %s', command.type);
      const startTime = Date.now();

      const result = await commandHandler.handle(command);

      const duration = Date.now() - startTime;
      debugCommand('Handler executed successfully in %dms', duration);

      await publishEventsFromResult(result, command);
    } catch (error) {
      debugCommand('ERROR: Handler failed for command %s: %O', command.type, error);
      debugCommand('ERROR: Failed command data: %O', command.data);
      throw new Error(`Command handling failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  async function publishEventsFromResult<TCommand extends Command>(
    result: Event | Event[],
    command: TCommand,
  ): Promise<void> {
    const events = Array.isArray(result) ? result : [result];
    for (const event of events) {
      const eventWithRequestId = {
        ...event,
        requestId: event.requestId ?? command.requestId,
        correlationId: event.correlationId ?? command.correlationId,
      };
      debugCommand('Publishing event from command handler: %s', event.type);
      await publishEvent(eventWithRequestId);
    }
  }

  function subscribeToEvent<TEvent extends Event>(eventType: string, handler: EventHandler<TEvent>): EventSubscription {
    debugEvent('Subscribing to event: %s with handler: %s', eventType, handler.name);

    if (state.eventHandlers[eventType] === undefined) {
      state.eventHandlers[eventType] = [];
      debugEvent('Created new handler array for event type: %s', eventType);
    }

    state.eventHandlers[eventType].push(handler as EventHandler);
    debugEvent('Handler added, total handlers for %s: %d', eventType, state.eventHandlers[eventType].length);

    return {
      unsubscribe: () => {
        debugEvent('Unsubscribing handler %s from event %s', handler.name, eventType);
        const handlers = state.eventHandlers[eventType];
        if (handlers !== undefined) {
          const index = handlers.indexOf(handler as EventHandler);
          if (index > -1) {
            handlers.splice(index, 1);
            debugEvent('Handler removed, remaining handlers for %s: %d', eventType, handlers.length);
            if (handlers.length === 0) {
              delete state.eventHandlers[eventType];
              debugEvent('No handlers left for %s, removed from state', eventType);
            }
          }
        }
      },
    };
  }

  async function publishEvent<TEvent extends Event>(event: TEvent): Promise<void> {
    debugEvent('Publishing event: %s', event.type);
    debugEvent('  Request ID: %s', event.requestId ?? 'none');
    debugEvent('  Correlation ID: %s', event.correlationId ?? 'none');
    debugEvent('  Timestamp: %s', event.timestamp || 'none');
    debugEvent('  Data keys: %o', Object.keys(event.data));

    // Log full event data for error events or when debugging is enabled
    if (event.type.includes('Failed') || event.type.includes('Error')) {
      debugEvent('  Event data (error event): %O', event.data);
    }

    // Get both specific handlers and all-event handlers
    const specificHandlers = state.eventHandlers[event.type] ?? [];
    const allHandlers = state.allEventHandlers;
    const handlers = [...specificHandlers, ...allHandlers];

    debugEvent(
      'Found %d specific + %d all-event handlers for event %s',
      specificHandlers.length,
      allHandlers.length,
      event.type,
    );

    if (handlers.length === 0) {
      debugEvent('No handlers registered for event: %s', event.type);
      return;
    }

    const results = await Promise.allSettled(
      handlers.map((handler) => {
        debugEvent('Executing handler %s for event %s', handler.name, event.type);
        try {
          return handler.handle(event);
        } catch (error) {
          debugEvent('ERROR: Handler %s failed for event %s: %O', handler.name, event.type, error);
          throw error;
        }
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      debugEvent('ERROR: %d/%d handlers failed for event %s', failures.length, handlers.length, event.type);
      failures.forEach((failure, index) => {
        if (failure.status === 'rejected') {
          debugEvent('  Handler failure %d: %O', index + 1, failure.reason);
        }
      });
    } else {
      debugEvent('All handlers executed successfully for event %s', event.type);
    }
  }

  function subscribeAll<TEvent extends Event = Event>(handler: EventHandler<TEvent>): EventSubscription {
    debugEvent('Subscribing to ALL events with handler: %s', handler.name);

    state.allEventHandlers.push(handler as EventHandler);
    debugEvent('All-event handler added, total all-event handlers: %d', state.allEventHandlers.length);

    return {
      unsubscribe: () => {
        debugEvent('Unsubscribing all-event handler: %s', handler.name);
        const index = state.allEventHandlers.indexOf(handler as EventHandler);
        if (index > -1) {
          state.allEventHandlers.splice(index, 1);
          debugEvent('All-event handler removed, remaining: %d', state.allEventHandlers.length);
        }
      },
    };
  }

  function registerEventHandler<TEvent extends Event>(eventHandler: EventHandler<TEvent>): EventSubscription {
    debugHandler('Registering event handler: %s', eventHandler.name);
    // For backward compatibility, infer event type from handler name
    const eventType = eventHandler.name.replace(/Handler$/, '');
    return subscribeToEvent(eventType, eventHandler);
  }

  debug('Message bus creation complete');
  debug(
    '  Available methods: registerCommandHandler, sendCommand, publishEvent, subscribeToEvent, subscribeAll, registerEventHandler',
  );

  function getCommandHandlers(): Record<string, CommandHandler> {
    return { ...state.commandHandlers };
  }

  return {
    registerCommandHandler,
    registerEventHandler,
    sendCommand,
    publishEvent,
    subscribeToEvent,
    subscribeAll,
    getCommandHandlers,
  };
}

export type MessageBus = ReturnType<typeof createMessageBus>;

/*
  Architecture Overview

  packages/cli/
  ├── src/
  │   ├── server/
  │   │   ├── message-bus-server.ts    # Express + Socket.io server
  │   │   ├── config-loader.ts         # Load and execute DSL from config
  │   │   ├── state-manager.ts         # Functional state management with fold
  │   │   └── dsl-executor.ts          # Execute on() and dispatch() functions
  │   ├── dsl/
  │   │   ├── index.ts                 # Executable DSL functions
  │   │   └── types.ts                 # DSL type definitions
  │   ├── commands/
  │   │   └── serve.ts                  # Server command (default when no args)
  │   └── index.ts                      # Modified to start server by default

  packages/message-bus/
  └── src/
      └── message-bus.ts                # Remove DSL stubs, keep core bus

  Key Design Decisions

  1. Executable DSL Functions
    - on() will register event handlers that execute dispatch calls
    - dispatch() will send commands to the message bus
    - fold() will be a pure function: (state, event) => newState
  2. Functional State Management
  type FoldFunction<S, E> = (state: S, event: E) => S;

  class StateManager {
    private state: any = {};
    private folds: Map<string, FoldFunction<any, any>>;

    applyEvent(event: Event) {
      const fold = this.folds.get(event.type);
      if (fold) {
        this.state = fold(this.state, event);
      }
    }
  }
  3. Direct Message Bus Integration
    - HTTP POST /command → Message Bus → Events → Handlers
    - No CLI command execution, direct bus communication
    - Add TODO comments for future type validation
  4. Event Flow
    - Events only trigger message bus handlers
    - Comment placeholder for future event store
    - WebSocket broadcasts handled separately if needed
  5. CLI Default Behavior
    - auto with no args → starts server
    - auto <command> → executes command via message bus if server running
    - auto --local <command> → force local execution

  Implementation Steps

  Step 1: Move and Implement DSL Functions

  // packages/cli/src/dsl/index.ts
  export function on<T extends Event>(
    eventType: string, 
    handler: (event: T) => Command | Command[] | void
  ): EventRegistration {
    return { type: 'on', eventType, handler };
  }

  export function dispatch<T extends Command>(command: T): DispatchAction {
    return { type: 'dispatch', command };
  }

  dispatch.parallel = <T extends Command>(commands: T[]): DispatchAction => ({
    type: 'dispatch-parallel',
    commands
  });

  dispatch.sequence = <T extends Command>(commands: T[]): DispatchAction => ({
    type: 'dispatch-sequence',
    commands
  });

  export function fold<S, E extends Event>(
    eventType: string,
    reducer: (state: S, event: E) => S
  ): FoldRegistration {
    return { type: 'fold', eventType, reducer };
  }

  Step 2: Config Loader with DSL Execution

  // packages/cli/src/server/config-loader.ts
  export async function loadMessageBusConfig(configPath: string) {
    const jiti = createJiti(import.meta.url, { interopDefault: true });

    // Import config with executable DSL functions
    const configModule = await jiti.import(configPath);
    const config = configModule.default || configModule;

    // Extract registrations from executed DSL
    const registrations = {
      eventHandlers: [],
      foldFunctions: [],
      state: config.state || {}
    };

    // Parse messageBus.handlers if it exists
    if (config.messageBus?.handlers) {
      // Execute handlers to get registrations
      const handlers = config.messageBus.handlers;
      if (typeof handlers === 'function') {
        handlers({ on, dispatch, fold });
      }
    }

    return registrations;
  }

  Step 3: Message Bus Server

  // packages/cli/src/server/message-bus-server.ts
  import express from 'express';
  import { Server as SocketIOServer } from 'socket.io';
  import { createMessageBus } from '@auto-engineer/message-bus';

  export class MessageBusServer {
    private app: express.Application;
    private io: SocketIOServer;
    private messageBus: MessageBus;
    private stateManager: StateManager;

    async start(port = 5555, wsPort = 5556) {
      this.app = express();
      this.app.use(express.json());

      // HTTP endpoint for commands
      this.app.post('/command', async (req, res) => {
        try {
          const command = req.body;

          // TODO: Add type validation based on command types
          // validateCommand(command);

          // Send to message bus (non-blocking)
          this.messageBus.sendCommand(command)
            .catch(err => console.error('Command failed:', err));

          res.json({ status: 'ack', commandId: command.requestId });
        } catch (error) {
          res.status(400).json({ status: 'nack', error: error.message });
        }
      });

      // WebSocket server
      this.io = new SocketIOServer(wsPort, {
        cors: { origin: '*' }
      });

      this.io.on('connection', (socket) => {
        console.log('WebSocket client connected');
        // WebSocket handling for future use
      });

      // TODO: Add event store integration here
      // this.eventStore = new EventStore();
      // this.messageBus.subscribeAll(event => this.eventStore.append(event));

      await this.app.listen(port);
      console.log(`Message bus server running on port ${port}`);
      console.log(`WebSocket server running on port ${wsPort}`);
    }
  }

  Step 4: Update CLI Default Behavior

  // packages/cli/src/index.ts
  if (process.argv.length === 2) {
    // No arguments provided, start server
    const server = new MessageBusServer();
    await server.start();
  } else {
    // Parse and execute commands
    program.parse(process.argv);
  }

  Step 5: Integration Test

  // packages/cli/src/server/server.test.ts
  describe('Message Bus Server Integration', () => {
    it('should load config and handle commands', async () => {
      // Create test config with DSL
      const testConfig = `
        export default {
          messageBus: {
            handlers: ({ on, dispatch }) => {
              on('OrderCreated', (event) => 
                dispatch({
                  type: 'SendEmail',
                  data: { orderId: event.data.orderId }
                })
              );
            },
            state: {
              orders: []
            },
            folds: ({ fold }) => {
              fold('OrderCreated', (state, event) => ({
                ...state,
                orders: [...state.orders, event.data]
              }));
            }
          }
        };
      `;

      // Start server with config
      const server = new MessageBusServer();
      await server.loadConfig(testConfig);
      await server.start();

      // Send command via HTTP
      const response = await fetch('http://localhost:5555/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CreateOrder',
          data: { customerId: '123', items: [] }
        })
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        status: 'ack',
        commandId: expect.any(String)
      });
    });
  });

  File Structure Summary

  New Files:
  1. packages/cli/src/dsl/index.ts - Executable DSL functions
  2. packages/cli/src/dsl/types.ts - DSL type definitions
  3. packages/cli/src/server/message-bus-server.ts - Express/Socket.io server
  4. packages/cli/src/server/config-loader.ts - Config parser with DSL execution
  5. packages/cli/src/server/state-manager.ts - Functional state management
  6. packages/cli/src/server/dsl-executor.ts - Execute on/dispatch registrations
  7. packages/cli/src/server/server.test.ts - Integration tests

  Modified Files:
  1. packages/cli/src/index.ts - Default to server mode
  2. packages/message-bus/src/message-bus.ts - Remove DSL stubs
  3. packages/cli/package.json - Add express, socket.io dependencies

  Dependencies to Add

  {
    "dependencies": {
      "express": "^4.18.0",
      "socket.io": "^4.7.5",
      "cors": "^2.8.5"
    },
    "devDependencies": {
      "@types/express": "^4.17.0",
      "@types/cors": "^2.8.0"
    }
  }

  Does this plan align with your vision? Should I proceed with the implementation?

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                                                                   │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
  ⏵⏵ bypass permissions on (shift+tab to cycle)                                                                   ⧉ In message-bus.ts





*/
