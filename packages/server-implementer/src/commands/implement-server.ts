import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import path from 'path';
import { existsSync } from 'fs';
import { runFlows } from '../agent/runFlows';
import createDebug from 'debug';

const debug = createDebug('server-impl:command');
const debugHandler = createDebug('server-impl:command:handler');
const debugProcess = createDebug('server-impl:command:process');
const debugResult = createDebug('server-impl:command:result');

export const implementServerManifest = {
  handler: () => Promise.resolve({ default: implementServerCommandHandler }),
  description: 'AI implements server TODOs and tests',
  usage: 'implement:server <server-dir>',
  examples: ['$ auto implement:server ./server'],
  args: [{ name: 'server-dir', description: 'Server directory path', required: true }],
};

export type ImplementServerCommand = Command<
  'ImplementServer',
  {
    serverDirectory: string;
  }
>;

export type ServerImplementedEvent = Event<
  'ServerImplemented',
  {
    serverDirectory: string;
    flowsImplemented: number;
  }
>;

export type ServerImplementationFailedEvent = Event<
  'ServerImplementationFailed',
  {
    serverDirectory: string;
    error: string;
  }
>;

async function handleImplementServerCommandInternal(
  command: ImplementServerCommand,
): Promise<ServerImplementedEvent | ServerImplementationFailedEvent> {
  const { serverDirectory } = command.data;

  debug('Handling ImplementServerCommand');
  debug('  Server directory: %s', serverDirectory);
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');

  try {
    const serverRoot = path.resolve(serverDirectory);
    const flowsDir = path.join(serverRoot, 'src', 'domain', 'flows');

    debugHandler('Resolved paths:');
    debugHandler('  Server root: %s', serverRoot);
    debugHandler('  Flows directory: %s', flowsDir);

    if (!existsSync(flowsDir)) {
      debugHandler('ERROR: Flows directory not found at %s', flowsDir);
      return {
        type: 'ServerImplementationFailed',
        data: {
          serverDirectory,
          error: `Flows directory not found at: ${flowsDir}`,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    debugProcess('Starting flow runner for directory: %s', flowsDir);

    // Run the flows directly without spawning
    await runFlows(flowsDir);

    debugProcess('Flow runner completed successfully');

    // For now, we don't have a way to count flows, so we'll use 0
    // This could be enhanced by having runFlows return statistics
    const flowsImplemented = 0;

    debugResult('Process succeeded');
    debugResult('Flows implemented: %d', flowsImplemented);

    const successEvent: ServerImplementedEvent = {
      type: 'ServerImplemented',
      data: {
        serverDirectory,
        flowsImplemented,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };

    debugResult('Returning success event: ServerImplemented');
    return successEvent;
  } catch (error) {
    debug('ERROR: Exception caught: %O', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      type: 'ServerImplementationFailed',
      data: {
        serverDirectory,
        error: errorMessage,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const implementServerCommandHandler: CommandHandler<
  ImplementServerCommand,
  ServerImplementedEvent | ServerImplementationFailedEvent
> = {
  name: 'ImplementServer',
  handle: async (
    command: ImplementServerCommand,
  ): Promise<ServerImplementedEvent | ServerImplementationFailedEvent> => {
    debug('CommandHandler executing for ImplementServer');
    const result = await handleImplementServerCommandInternal(command);

    if (result.type === 'ServerImplemented') {
      debug('Command handler completed: success');
      debug('✅ Server implementation completed successfully');
      if (result.data.flowsImplemented > 0) {
        debug('   %d flows implemented', result.data.flowsImplemented);
      }
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      debug('❌ Server implementation failed: %s', result.data.error);
    }
    return result;
  },
};

// Default export is the command handler
export default implementServerCommandHandler;
