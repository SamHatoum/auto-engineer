import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import path from 'path';
import { execa } from 'execa';
import { access } from 'fs/promises';
import createDebug from 'debug';

const debug = createDebug('auto:dev-server:start-server');

export type StartServerCommand = Command<
  'StartServer',
  {
    serverDirectory: string;
    command?: string;
  }
>;

export type ServerStartedEvent = Event<
  'ServerStarted',
  {
    serverDirectory: string;
    pid: number;
    port?: number;
  }
>;

export type ServerStartFailedEvent = Event<
  'ServerStartFailed',
  {
    serverDirectory: string;
    error: string;
  }
>;

export type StartServerEvents = ServerStartedEvent | ServerStartFailedEvent;

export const commandHandler = defineCommandHandler<
  StartServerCommand,
  (command: StartServerCommand) => Promise<ServerStartedEvent | ServerStartFailedEvent>
>({
  name: 'StartServer',
  alias: 'start:server',
  description: 'Start the development server',
  category: 'dev',
  icon: 'server',
  fields: {
    serverDirectory: {
      description: 'Directory containing the server',
      required: true,
    },
    command: {
      description: 'Command to run (default: pnpm start)',
      required: false,
    },
  },
  examples: [
    '$ auto start:server --server-directory=./server',
    '$ auto start:server --server-directory=./server --command="pnpm dev"',
  ],
  events: ['ServerStarted', 'ServerStartFailed'],
  handle: async (command: Command): Promise<ServerStartedEvent | ServerStartFailedEvent> => {
    const typedCommand = command as StartServerCommand;
    debug('CommandHandler executing for StartServer');
    const { serverDirectory, command: customCommand } = typedCommand.data;

    debug('Handling StartServerCommand');
    debug('  Server directory: %s', serverDirectory);
    debug('  Command: %s', customCommand ?? 'pnpm start');
    debug('  Request ID: %s', typedCommand.requestId);
    debug('  Correlation ID: %s', typedCommand.correlationId ?? 'none');

    try {
      const serverDir = path.resolve(serverDirectory);

      debug('Resolved paths:');
      debug('  Server directory: %s', serverDir);

      await access(path.join(serverDir, 'package.json'));
      debug('package.json found in server directory');

      const cmd = customCommand ?? 'pnpm start';
      const [executable, ...args] = cmd.split(' ');

      debug('Starting server...');
      debug('Executable: %s', executable);
      debug('Args: %o', args);

      const subprocess = execa(executable, args, {
        cwd: serverDir,
        stdio: 'inherit',
        reject: false,
        detached: false,
      });

      const pid = subprocess.pid;

      if (pid === undefined) {
        throw new Error('Failed to start server process');
      }

      debug('Server process started with PID: %d', pid);

      subprocess.catch((error) => {
        debug('Server process error: %O', error);
      });

      return {
        type: 'ServerStarted',
        data: {
          serverDirectory,
          pid,
        },
        timestamp: new Date(),
        requestId: typedCommand.requestId,
        correlationId: typedCommand.correlationId,
      };
    } catch (error) {
      debug('ERROR: Exception caught: %O', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        type: 'ServerStartFailed',
        data: {
          serverDirectory,
          error: errorMessage,
        },
        timestamp: new Date(),
        requestId: typedCommand.requestId,
        correlationId: typedCommand.correlationId,
      };
    }
  },
});

export default commandHandler;
