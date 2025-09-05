import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import {
  createMessageBus,
  type MessageBus,
  type Command,
  type Event,
  type UnifiedCommandHandler,
} from '@auto-engineer/message-bus';
import createDebug from 'debug';
import { StateManager, type FoldFunction } from './state-manager';
import { FileSyncer } from './file-syncer';
import type { EventRegistration, FoldRegistration, DispatchAction } from '../dsl/types';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const debug = createDebug('auto-engineer:server');
const debugHttp = createDebug('auto-engineer:server:http');
const debugWs = createDebug('auto-engineer:server:ws');
const debugBus = createDebug('auto-engineer:server:bus');

export interface MessageBusServerConfig {
  port?: number;
  wsPort?: number;
  fileSyncDir?: string;
  fileSyncExtensions?: string[];
  enableFileSync?: boolean;
}

export class MessageBusServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private messageBus: MessageBus;
  private stateManager: StateManager<Record<string, unknown>>;
  private fileSyncer?: FileSyncer;
  private config: MessageBusServerConfig;
  private eventHandlers: Map<string, Array<(event: Event) => void>> = new Map();
  private foldRegistry: Map<string, FoldFunction<Record<string, unknown>>> = new Map();
  private commandHandlerNames: string[] = [];
  private commandMetadata: Map<
    string,
    { alias: string; description: string; package: string; version?: string; category?: string }
  > = new Map();
  private eventHistory: Array<{ event: Event; timestamp: string }> = [];
  private maxEventHistory = 1000; // Limit to prevent memory issues

  constructor(config: MessageBusServerConfig = {}) {
    this.config = {
      port: config.port ?? 5555,
      wsPort: config.wsPort ?? 5556,
      fileSyncDir: config.fileSyncDir ?? '.',
      fileSyncExtensions: config.fileSyncExtensions ?? ['.js', '.html', '.css'],
      enableFileSync: config.enableFileSync !== false,
    };

    // Initialize Express app
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    // Create HTTP server
    this.httpServer = createServer(this.app);

    // Initialize Socket.IO on the same server
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: '*' },
    });

    // Initialize message bus and state manager
    this.messageBus = createMessageBus();
    this.stateManager = new StateManager<Record<string, unknown>>();

    // Set up global event listener for state management
    this.setupGlobalEventListener();

    // Set up HTTP routes
    this.setupRoutes();

    // Set up WebSocket handlers
    this.setupWebSocketHandlers();

    debug('Message bus server initialized');
  }

  /**
   * Set up global event listener for state management and event forwarding
   */
  private setupGlobalEventListener(): void {
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
        this.io.emit('event', event);
        debugWs('Broadcasted event to WebSocket clients:', event.type);
      },
    });
  }

  /**
   * Set up HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // Serve dashboard
    this.app.get('/', (_req, res) => {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      res.sendFile(join(__dirname, 'dashboard.html'));
    });

    // Get registry information
    this.app.get('/registry', (_req, res) => {
      // Sort commands alphabetically by alias
      const sortedCommands = this.commandHandlerNames
        .map((name) => ({
          name,
          metadata: this.commandMetadata.get(name),
        }))
        .sort((a, b) => {
          const aliasA = a.metadata?.alias ?? a.name;
          const aliasB = b.metadata?.alias ?? b.name;
          return aliasA.localeCompare(aliasB);
        });

      res.json({
        eventHandlers: Array.from(this.eventHandlers.keys()),
        folds: Array.from(this.foldRegistry.keys()),
        commandHandlers: sortedCommands.map((cmd) => cmd.name),
        commandsWithMetadata: sortedCommands.map((cmd) => ({
          name: cmd.name,
          alias: cmd.metadata?.alias ?? cmd.name,
          description: cmd.metadata?.description ?? 'No description',
          package: cmd.metadata?.package ?? 'unknown',
          version: cmd.metadata?.version,
          category: cmd.metadata?.category,
        })),
      });
    });

    // Get event history
    this.app.get('/events', (_req, res) => {
      res.json(this.eventHistory);
    });

    // Get current state
    this.app.get('/state', (_req, res) => {
      res.json(this.stateManager.getState());
    });

    // Command endpoint
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.app.post('/command', async (req, res) => {
      try {
        const command = req.body as Command;

        debugHttp('Received command:', command.type);
        debugHttp('Command data:', command.data);

        // Validate command structure
        if (!command.type || !('data' in command)) {
          return res.status(400).json({
            status: 'nack',
            error: 'Invalid command structure. Must have type and data fields.',
          });
        }

        // Add request ID if not present
        const hasRequestId = command.requestId !== null && command.requestId !== undefined && command.requestId !== '';
        const cmdWithId = hasRequestId
          ? command
          : { ...command, requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` };

        // TODO: Add type validation based on command types
        // validateCommand(command);

        // Check if command handler exists
        if (!this.commandHandlerNames.includes(cmdWithId.type)) {
          return res.status(404).json({
            status: 'nack',
            error: `Command handler not found for command: ${cmdWithId.type}`,
            availableCommands: this.commandHandlerNames,
          });
        }

        // Send to message bus (non-blocking)
        this.messageBus
          .sendCommand(cmdWithId)
          .then(() => {
            debugHttp('Command processed successfully:', cmdWithId.type);
          })
          .catch((err) => {
            const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
            if (!isTest) {
              console.error('Command failed:', err);
            }
            debugHttp('Command failed (suppressed in tests):', err);
            // Emit error event for UI to capture
            this.io.emit('commandError', {
              commandId: cmdWithId.requestId,
              error: err instanceof Error ? err.message : String(err),
              timestamp: new Date().toISOString(),
            });
          });

        // Return acknowledgment immediately
        res.json({
          status: 'ack',
          commandId: cmdWithId.requestId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        debugHttp('Error processing command:', error);
        res.status(400).json({
          status: 'nack',
          error: error instanceof Error ? error.message : 'Failed to process command',
        });
      }
    });

    debugHttp('HTTP routes configured');
  }

  /**
   * Set up WebSocket handlers
   */
  private setupWebSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      debugWs('WebSocket client connected:', socket.id);

      // Send current state to new client
      socket.emit('state', this.stateManager.getState());

      // Handle command from WebSocket
      socket.on('command', async (command: Command) => {
        debugWs('Received command via WebSocket:', command.type);

        try {
          // Add request ID if not present
          const hasRequestId =
            command.requestId !== null && command.requestId !== undefined && command.requestId !== '';
          const cmdWithId = hasRequestId
            ? command
            : { ...command, requestId: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` };

          await this.messageBus.sendCommand(cmdWithId);

          socket.emit('command-ack', {
            status: 'ack',
            commandId: cmdWithId.requestId,
          });
        } catch (error) {
          socket.emit('command-ack', {
            status: 'nack',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle state query
      socket.on('get-state', () => {
        socket.emit('state', this.stateManager.getState());
      });

      socket.on('disconnect', () => {
        debugWs('WebSocket client disconnected:', socket.id);
      });
    });

    debugWs('WebSocket handlers configured');
  }

  /**
   * Process handler result to reduce complexity
   */
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

  // eslint-disable-next-line complexity
  private async processDispatchAction(action: DispatchAction): Promise<void> {
    if (action.type === 'dispatch' && action.command) {
      debugBus('Dispatching command from dispatch action:', action.command.type);
      await this.messageBus.sendCommand(action.command);
    } else if (action.type === 'dispatch-parallel' && action.commands) {
      debugBus('Dispatching parallel commands from event handler');
      await Promise.all(action.commands.map((cmd) => this.messageBus.sendCommand(cmd)));
    } else if (action.type === 'dispatch-sequence' && action.commands) {
      debugBus('Dispatching sequential commands from event handler');
      for (const cmd of action.commands) {
        await this.messageBus.sendCommand(cmd);
      }
    } else if (action.type === 'dispatch-custom' && action.commandFactory) {
      const cmds = action.commandFactory();
      const commands = Array.isArray(cmds) ? cmds : [cmds];
      for (const cmd of commands) {
        await this.messageBus.sendCommand(cmd);
      }
    }
  }

  /**
   * Register event handlers from DSL
   */
  registerEventHandler(registration: EventRegistration): void {
    debug('Registering event handler for:', registration.eventType);

    const handler = async (event: Event) => {
      try {
        const result = registration.handler(event);
        await this.processHandlerResult(result);
      } catch (error) {
        const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
        if (!isTest) {
          console.error('Error in event handler:', error);
        }
        debug('Event handler error (suppressed in tests):', error);
      }
    };

    // Store handler for later execution
    if (!this.eventHandlers.has(registration.eventType)) {
      this.eventHandlers.set(registration.eventType, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.eventHandlers.get(registration.eventType)!.push(handler);
  }

  /**
   * Register fold function from DSL
   */
  registerFold(registration: FoldRegistration): void {
    debug('Registering fold for:', registration.eventType);
    const foldFn = registration.reducer as FoldFunction<Record<string, unknown>>;
    this.stateManager.registerFold(registration.eventType, foldFn);
    this.foldRegistry.set(registration.eventType, foldFn);
  }

  /**
   * Set command metadata for dashboard display
   */
  setCommandMetadata(
    commandName: string,
    metadata: { alias: string; description: string; package: string; version?: string; category?: string },
  ): void {
    this.commandMetadata.set(commandName, metadata);
    debugBus('Set metadata for command:', commandName, metadata);
  }

  /**
   * Register command handlers directly with the message bus
   */
  registerCommandHandlers(handlers: unknown[]): void {
    debugBus('registerCommandHandlers called with', handlers.length, 'handlers');
    debugBus('Current commandHandlerNames:', this.commandHandlerNames);

    for (const handler of handlers) {
      this.processCommandHandler(handler);
    }

    debugBus('After registration, commandHandlerNames:', this.commandHandlerNames);
  }

  private processCommandHandler(handler: unknown): void {
    if (
      handler !== null &&
      handler !== undefined &&
      typeof handler === 'object' &&
      'name' in handler &&
      'handle' in handler
    ) {
      const cmdHandler = handler as { name: string; handle: (cmd: Command) => Promise<Event | Event[] | void> };
      debugBus('Registering command handler:', cmdHandler.name);
      this.messageBus.registerCommandHandler(cmdHandler);
      this.commandHandlerNames.push(cmdHandler.name);

      this.extractUnifiedHandlerMetadata(handler, cmdHandler.name);
    } else {
      debugBus('Skipping invalid handler:', handler);
    }
  }

  private extractUnifiedHandlerMetadata(handler: unknown, commandName: string): void {
    if (typeof handler === 'object' && handler !== null && 'alias' in handler && 'description' in handler) {
      const unifiedHandler = handler as UnifiedCommandHandler<Command<string, Record<string, unknown>>>;
      debugBus('Extracting metadata from UnifiedCommandHandler:', commandName);

      this.setCommandMetadata(commandName, {
        alias: unifiedHandler.alias,
        description: unifiedHandler.description,
        package: unifiedHandler.package?.name ?? 'unknown',
        version: unifiedHandler.package?.version,
        category: unifiedHandler.category,
      });
    }
  }

  /**
   * Initialize state
   */
  initializeState(state: unknown): void {
    // Update the existing state manager's state rather than creating a new one
    // This preserves registered folds
    // Use type assertion through unknown to access private property
    const sm = this.stateManager as unknown as { state: Record<string, unknown> };
    sm.state = state as Record<string, unknown>;
    debug('State initialized:', state);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const { port, enableFileSync, fileSyncDir, fileSyncExtensions } = this.config;

    // Start file syncer if enabled
    if (enableFileSync === true) {
      this.fileSyncer = new FileSyncer(this.io, fileSyncDir, fileSyncExtensions);
      this.fileSyncer.start();
      debug(`File syncer started for ${fileSyncDir} with extensions: ${fileSyncExtensions?.join(', ')}`);
    }

    // Start HTTP/WebSocket server
    await new Promise<void>((resolve) => {
      this.httpServer.listen(port, () => {
        // Only show console output if not in test environment
        const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

        if (!isTest) {
          console.log(`Message bus server running on port ${port}`);
          console.log(`Dashboard available at http://localhost:${port}`);
          console.log(`WebSocket server available on ws://localhost:${port}`);
          if (enableFileSync === true) {
            console.log(`File sync enabled for ${fileSyncDir} (extensions: ${fileSyncExtensions?.join(', ')})`);
          }
        }

        debug('Message bus server started on port', port);
        resolve();
      });
    });

    // TODO: Add event store integration here
    // this.eventStore = new EventStore();
    // this.messageBus.subscribeAll({
    //   name: 'EventStore',
    //   handle: event => this.eventStore.append(event)
    // });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    debug('Stopping message bus server');

    // Stop file syncer
    if (this.fileSyncer) {
      this.fileSyncer.stop();
    }

    // Close WebSocket connections
    await this.io.close();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => {
        debug('Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get the message bus instance
   */
  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  /**
   * Get the state manager instance
   */
  getStateManager(): StateManager<Record<string, unknown>> {
    return this.stateManager;
  }

  /**
   * Get the event history
   */
  getEventHistory(): Array<{ event: Event; timestamp: string }> {
    return this.eventHistory;
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }
}
