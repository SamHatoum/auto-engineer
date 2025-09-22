import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createMessageBus, type MessageBus, type Event, type Command } from '@auto-engineer/message-bus';
import { MemoryMessageStore, type ILocalMessageStore } from '@auto-engineer/message-store';
import createDebug from 'debug';
import { StateManager } from './state-manager';
import { FileSyncer } from './file-syncer';
import type { EventRegistration, FoldRegistration, SettledRegistration } from '../dsl/types';
import { setupHttpRoutes } from './http-routes';
import { setupWebSocketHandlers } from './websocket-handler';
import { EventProcessor } from './event-processor';
import { CommandRegistry } from './command-registry';
import { CommandMetadataService } from './command-metadata-service';
import { SettledTracker } from './settled-tracker';

const debug = createDebug('auto-engineer:server');

export interface MessageBusServerConfig {
  port?: number;
  wsPort?: number;
  fileSyncDir?: string;
  fileSyncExtensions?: string[];
  enableFileSync?: boolean;
  messageStore?: ILocalMessageStore;
  maxMessages?: number;
}

export class MessageBusServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private messageBus: MessageBus;
  private messageStore: ILocalMessageStore;
  private stateManager: StateManager<Record<string, unknown>>;
  private fileSyncer?: FileSyncer;
  private config: MessageBusServerConfig;
  private eventProcessor: EventProcessor;
  private commandRegistry: CommandRegistry;
  private settledTracker: SettledTracker;
  private currentSessionId?: string;
  private dslRegistrations: Array<import('../dsl/types').DslRegistration> = [];

  constructor(config: MessageBusServerConfig = {}) {
    this.config = {
      port: config.port ?? 5555,
      wsPort: config.wsPort ?? 5556,
      fileSyncDir: config.fileSyncDir ?? '.',
      fileSyncExtensions: config.fileSyncExtensions ?? ['.js', '.html', '.css'],
      enableFileSync: config.enableFileSync !== false,
      maxMessages: config.maxMessages ?? 50000,
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

    // Initialize message bus, message store, and state manager
    this.messageBus = createMessageBus();
    this.messageStore = config.messageStore ?? new MemoryMessageStore();
    this.stateManager = new StateManager<Record<string, unknown>>();

    // Initialize modules
    this.commandRegistry = new CommandRegistry(this.messageBus, this.stateManager);
    this.settledTracker = new SettledTracker((action) => {
      // Handle dispatch actions from settled handlers
      void this.eventProcessor.processDispatchAction(action);
    }, this.commandRegistry.getMetadataService());
    this.eventProcessor = new EventProcessor(
      this.messageBus,
      this.messageStore,
      this.stateManager,
      (event: Event) => this.io.emit('event', event),
      this.settledTracker,
    );

    // Set up global event listener for state management
    this.eventProcessor.setupGlobalEventListener();

    // Set up WebSocket handlers
    this.setupWebSocketHandlers();

    // Set up basic HTTP routes (can be called again after config loading to include DSL registrations)
    this.setupRoutes();

    debug('Message bus server initialized');
  }

  /**
   * Set up HTTP routes
   */
  public setupRoutes(): void {
    setupHttpRoutes(this.app, this.messageBus, this.stateManager, {
      commandHandlerNames: this.commandRegistry.getCommandHandlerNames(),
      commandMetadata: this.commandRegistry.getCommandMetadata(),
      commandMetadataService: this.commandRegistry.getMetadataService(),
      eventHandlers: this.eventProcessor.getEventHandlers(),
      foldRegistry: this.commandRegistry.getFoldRegistry(),
      messageStore: this.messageStore,
      dslRegistrations: this.dslRegistrations,
      getDslRegistrations: () => this.dslRegistrations,
      onCommandError: (error) => {
        this.io.emit('commandError', error);
      },
      onCommandReceived: async (command: Command) => {
        await this.eventProcessor.storeCommand(command);
      },
    });
  }

  /**
   * Set up WebSocket handlers
   */
  private setupWebSocketHandlers(): void {
    setupWebSocketHandlers(this.io, this.messageBus, this.stateManager);
  }

  /**
   * Register event handlers from DSL
   */
  registerEventHandler(registration: EventRegistration): void {
    this.eventProcessor.registerEventHandler(registration);
  }

  /**
   * Register fold function from DSL
   */
  registerFold(registration: FoldRegistration): void {
    this.commandRegistry.registerFold(registration);
  }

  /**
   * Register settled handler from DSL
   */
  registerSettledHandler(registration: SettledRegistration): void {
    this.settledTracker.registerSettledHandler(registration);
  }

  /**
   * Set command metadata for dashboard display
   */
  setCommandMetadata(
    commandName: string,
    metadata: { alias: string; description: string; package: string; version?: string; category?: string },
  ): void {
    this.commandRegistry.setCommandMetadata(commandName, { ...metadata, name: commandName });
  }

  /**
   * Register command handlers directly with the message bus
   */
  registerCommandHandlers(handlers: unknown[]): void {
    this.commandRegistry.registerCommandHandlers(handlers);
  }

  /**
   * Get the command metadata service
   */
  getCommandMetadataService(): CommandMetadataService {
    return this.commandRegistry.getMetadataService();
  }

  /**
   * Get the settled tracker (for testing)
   */
  getSettledTracker(): SettledTracker {
    return this.settledTracker;
  }

  setDslRegistrations(registrations: Array<import('../dsl/types').DslRegistration>): void {
    this.dslRegistrations = [...registrations];
  }

  getDslRegistrations(): Array<import('../dsl/types').DslRegistration> {
    return [...this.dslRegistrations];
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

    // Create a new session for this server startup
    this.currentSessionId = await this.messageStore.createSession();
    debug(`Created new session: ${this.currentSessionId}`);

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

    // End current session if exists
    if (this.currentSessionId !== undefined && this.currentSessionId !== null && this.currentSessionId !== '') {
      await this.messageStore.endSession(this.currentSessionId);
      debug(`Ended session: ${this.currentSessionId}`);
    }

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
   * Get the message store instance
   */
  getMessageStore(): ILocalMessageStore {
    return this.messageStore;
  }

  getEventProcessor(): EventProcessor {
    return this.eventProcessor;
  }
}
