import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { MessageBus, Command, Event } from '@auto-engineer/message-bus';
import type { IMessageStore, MessageFilter } from '@auto-engineer/message-store';
import type { StateManager, FoldFunction } from './state-manager';
import createDebug from 'debug';

const debugHttp = createDebug('auto-engineer:server:http');

export interface HttpRoutesConfig {
  commandHandlerNames: string[];
  commandMetadata: Map<
    string,
    { alias: string; description: string; package: string; version?: string; category?: string }
  >;
  eventHandlers: Map<string, Array<(event: Event) => void>>;
  foldRegistry: Map<string, FoldFunction<Record<string, unknown>>>;
  messageStore: IMessageStore;
  onCommandError: (error: { commandId: string; error: string; timestamp: string }) => void;
  onCommandReceived: (command: Command) => Promise<void>;
}

// Helper functions to reduce complexity
function validateCommandStructure(command: Command): string | null {
  if (!command.type || !('data' in command)) {
    return 'Invalid command structure. Must have type and data fields.';
  }
  return null;
}

function addMissingIds(command: Command): Command {
  const hasRequestId = command.requestId !== null && command.requestId !== undefined && command.requestId !== '';
  const hasCorrelationId =
    command.correlationId !== null && command.correlationId !== undefined && command.correlationId !== '';

  return {
    ...command,
    requestId: hasRequestId ? command.requestId : `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    correlationId: hasCorrelationId
      ? command.correlationId
      : `corr-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  };
}

function validateCommandHandler(commandType: string, availableCommands: string[]): string | null {
  if (!availableCommands.includes(commandType)) {
    return `Command handler not found for command: ${commandType}`;
  }
  return null;
}

async function processCommand(messageBus: MessageBus, command: Command, config: HttpRoutesConfig): Promise<void> {
  try {
    await messageBus.sendCommand(command);
    debugHttp('Command processed successfully:', command.type);
  } catch (err) {
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    if (!isTest) {
      console.error('Command failed:', err);
    }
    debugHttp('Command failed (suppressed in tests):', err);
    config.onCommandError({
      commandId: command.requestId ?? 'unknown',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
}

export function setupHttpRoutes(
  app: express.Application,
  messageBus: MessageBus,
  stateManager: StateManager<Record<string, unknown>>,
  config: HttpRoutesConfig,
): void {
  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Serve dashboard
  app.get('/', (_req, res) => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    res.sendFile(join(__dirname, 'dashboard.html'));
  });

  // Get registry information
  app.get('/registry', (_req, res) => {
    // Sort commands alphabetically by alias
    const sortedCommands = config.commandHandlerNames
      .map((name) => ({
        name,
        metadata: config.commandMetadata.get(name),
      }))
      .sort((a, b) => {
        const aliasA = a.metadata?.alias ?? a.name;
        const aliasB = b.metadata?.alias ?? b.name;
        return aliasA.localeCompare(aliasB);
      });

    res.json({
      eventHandlers: Array.from(config.eventHandlers.keys()),
      folds: Array.from(config.foldRegistry.keys()),
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

  // Get all messages with filtering
  // eslint-disable-next-line complexity, @typescript-eslint/no-misused-promises
  app.get('/messages', async (req, res) => {
    try {
      const filter: MessageFilter = {};

      // Parse query parameters
      if (req.query.messageType !== undefined && req.query.messageType !== null) {
        filter.messageType = req.query.messageType as 'command' | 'event';
      }
      if (req.query.messageNames !== undefined && req.query.messageNames !== null) {
        filter.messageNames = Array.isArray(req.query.messageNames)
          ? (req.query.messageNames as string[])
          : [req.query.messageNames as string];
      }
      if (req.query.streamId !== undefined && req.query.streamId !== null) {
        filter.streamId = req.query.streamId as string;
      }
      if (req.query.sessionId !== undefined && req.query.sessionId !== null) {
        filter.sessionId = req.query.sessionId as string;
      }
      if (req.query.correlationId !== undefined && req.query.correlationId !== null) {
        filter.correlationId = req.query.correlationId as string;
      }
      if (req.query.requestId !== undefined && req.query.requestId !== null) {
        filter.requestId = req.query.requestId as string;
      }
      if (req.query.fromPosition !== undefined && req.query.fromPosition !== null) {
        filter.fromPosition = BigInt(req.query.fromPosition as string);
      }
      if (req.query.toPosition !== undefined && req.query.toPosition !== null) {
        filter.toPosition = BigInt(req.query.toPosition as string);
      }
      if (req.query.jsonFilter !== undefined && req.query.jsonFilter !== null) {
        try {
          filter.jsonFilter = JSON.parse(req.query.jsonFilter as string) as Record<string, unknown>;
        } catch {
          return res.status(400).json({ error: 'Invalid JSON filter' });
        }
      }

      const count =
        req.query.count !== undefined && req.query.count !== null ? parseInt(req.query.count as string) : 1000;
      const messages = await config.messageStore.getAllMessages(filter, count);

      // Convert BigInt fields to strings for JSON serialization
      const serializedMessages = messages.map((message) => ({
        ...message,
        revision: message.revision.toString(),
        position: message.position.toString(),
      }));

      res.json(serializedMessages);
    } catch (error) {
      debugHttp('Error fetching messages:', error);
      console.error('Detailed error fetching messages:', error);
      res
        .status(500)
        .json({ error: 'Failed to fetch messages', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get commands only
  app.get('/commands', (req, res) => {
    (async () => {
      try {
        const count =
          req.query.count !== undefined && req.query.count !== null ? parseInt(req.query.count as string) : 1000;
        const commands = await config.messageStore.getAllCommands(undefined, count);

        // Convert BigInt fields to strings for JSON serialization
        const serializedCommands = commands.map((command) => ({
          ...command,
          revision: command.revision.toString(),
          position: command.position.toString(),
        }));

        res.json(serializedCommands);
      } catch (error) {
        console.error('Error fetching commands:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
      }
    })().catch((error) => {
      console.error('Unhandled error in /commands:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  // Get events only (backward compatibility)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/events', async (req, res) => {
    try {
      const count =
        req.query.count !== undefined && req.query.count !== null ? parseInt(req.query.count as string) : 1000;
      const events = await config.messageStore.getAllEvents(undefined, count);

      // Transform to legacy format for backward compatibility
      const legacyFormat = events.map((event) => ({
        event: event.message,
        timestamp: event.timestamp.toISOString(),
      }));

      res.json(legacyFormat);
    } catch (error) {
      debugHttp('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Get current state
  app.get('/state', (_req, res) => {
    res.json(stateManager.getState());
  });

  // Get sessions
  app.get('/sessions', (_req, res) => {
    (async () => {
      try {
        const sessions = await config.messageStore.getSessions();
        res.json(sessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
      }
    })().catch((error) => {
      console.error('Unhandled error in /sessions:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  // Get streams
  app.get('/streams', (_req, res) => {
    (async () => {
      try {
        const streams = await config.messageStore.getStreams();
        res.json(streams);
      } catch (error) {
        console.error('Error fetching streams:', error);
        res.status(500).json({ error: 'Failed to fetch streams' });
      }
    })().catch((error) => {
      console.error('Unhandled error in /streams:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  // Get messages from specific stream
  app.get('/streams/:streamId', (req, res) => {
    (async () => {
      try {
        const streamId = req.params.streamId;
        const count =
          req.query.count !== undefined && req.query.count !== null ? parseInt(req.query.count as string) : 1000;
        const messages = await config.messageStore.getMessages(streamId, undefined, count);

        // Convert BigInt fields to strings for JSON serialization
        const serializedMessages = messages.map((message) => ({
          ...message,
          revision: message.revision.toString(),
          position: message.position.toString(),
        }));

        res.json(serializedMessages);
      } catch (error) {
        console.error('Error fetching stream messages:', error);
        res.status(500).json({ error: 'Failed to fetch stream messages' });
      }
    })().catch((error) => {
      console.error('Unhandled error in /streams/:streamId:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  // Get stats
  app.get('/stats', (_req, res) => {
    (async () => {
      try {
        const stats = await config.messageStore.getStats();
        res.json(stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    })().catch((error) => {
      console.error('Unhandled error in /stats:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  // Command endpoint
  app.post('/command', (req, res) => {
    (async () => {
      try {
        const command = req.body as Command;

        debugHttp('Received command:', command.type);
        debugHttp('Command data:', command.data);

        // Validate command structure
        const structureError = validateCommandStructure(command);
        if (structureError !== null && structureError !== '') {
          return res.status(400).json({
            status: 'nack',
            error: structureError,
          });
        }

        // Add missing IDs
        const cmdWithId = addMissingIds(command);

        // Check if command handler exists
        const handlerError = validateCommandHandler(cmdWithId.type, config.commandHandlerNames);
        if (handlerError !== null && handlerError !== '') {
          return res.status(404).json({
            status: 'nack',
            error: handlerError,
            availableCommands: config.commandHandlerNames,
          });
        }

        // Store command in message store first
        await config.onCommandReceived(cmdWithId);

        // Process command asynchronously
        await processCommand(messageBus, cmdWithId, config);

        // Return acknowledgment immediately
        res.json({
          status: 'ack',
          commandId: cmdWithId.requestId ?? 'unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        debugHttp('Error processing command:', error);
        res.status(400).json({
          status: 'nack',
          error: error instanceof Error ? error.message : 'Failed to process command',
        });
      }
    })().catch((err) => {
      debugHttp('Unhandled error in command handler:', err);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'nack',
          error: 'Internal server error',
        });
      }
    });
  });

  debugHttp('HTTP routes configured');
}
