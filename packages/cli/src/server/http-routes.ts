import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { MessageBus, Command, Event } from '@auto-engineer/message-bus';
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
  eventHistory: Array<{ event: Event; timestamp: string }>;
  onCommandError: (error: { commandId: string; error: string; timestamp: string }) => void;
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

  // Get event history
  app.get('/events', (_req, res) => {
    res.json(config.eventHistory);
  });

  // Get current state
  app.get('/state', (_req, res) => {
    res.json(stateManager.getState());
  });

  // Command endpoint
  app.post('/command', (req, res) => {
    (async () => {
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

        // Check if command handler exists
        if (!config.commandHandlerNames.includes(cmdWithId.type)) {
          return res.status(404).json({
            status: 'nack',
            error: `Command handler not found for command: ${cmdWithId.type}`,
            availableCommands: config.commandHandlerNames,
          });
        }

        // Send to message bus (non-blocking)
        messageBus
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
            config.onCommandError({
              commandId: cmdWithId.requestId ?? 'unknown',
              error: err instanceof Error ? err.message : String(err),
              timestamp: new Date().toISOString(),
            });
          });

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
