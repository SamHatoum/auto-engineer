#!/usr/bin/env node
import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import createDebug from 'debug';

const debug = createDebug('emmett:implement-server');
const debugCommand = createDebug('emmett:implement-server:command');
const debugProcess = createDebug('emmett:implement-server:process');
const debugOutput = createDebug('emmett:implement-server:output');
const debugResult = createDebug('emmett:implement-server:result');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export async function handleImplementServerCommand(
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

    debugCommand('Resolved paths:');
    debugCommand('  Server root: %s', serverRoot);
    debugCommand('  Flows directory: %s', flowsDir);

    if (!existsSync(flowsDir)) {
      debugCommand('ERROR: Flows directory not found at %s', flowsDir);
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

    // Run the server implementation using tsx to execute the server-implementer
    const serverImplementerPath = path.resolve(__dirname, '../../../server-implementer/src/cli/index.ts');
    debugCommand('Server implementer path: %s', serverImplementerPath);

    return new Promise((resolve) => {
      debugProcess('Spawning process: npx tsx %s %s', serverImplementerPath, serverRoot);
      debugProcess('Working directory: %s', serverRoot);

      const child = spawn('npx', ['tsx', serverImplementerPath, serverRoot], {
        cwd: serverRoot,
        stdio: 'pipe',
      });

      debugProcess('Child process spawned with PID: %d', child.pid);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        debugOutput('STDOUT: %s', output.trim());
        process.stdout.write(output); // Pass through the output
      });

      child.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        debugOutput('STDERR: %s', output.trim());
        process.stderr.write(output); // Pass through the error output
      });

      child.on('close', (code) => {
        debugProcess('Process exited with code: %d', code);
        debugProcess('Total stdout length: %d bytes', stdout.length);
        debugProcess('Total stderr length: %d bytes', stderr.length);

        if (code === 0) {
          // Try to extract the number of flows implemented from output
          const flowsMatch = stdout.match(/(\d+)\s+flows?\s+implemented/i);
          const flowsImplemented = flowsMatch ? parseInt(flowsMatch[1], 10) : 0;

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
          resolve(successEvent);
        } else {
          const errorMessage = stderr || `Process exited with code ${code}`;
          debugResult('Process failed with error: %s', errorMessage);

          const failureEvent: ServerImplementationFailedEvent = {
            type: 'ServerImplementationFailed',
            data: {
              serverDirectory,
              error: errorMessage,
            },
            timestamp: new Date(),
            requestId: command.requestId,
            correlationId: command.correlationId,
          };
          debugResult('Returning failure event: ServerImplementationFailed');
          resolve(failureEvent);
        }
      });

      child.on('error', (error) => {
        debugProcess('ERROR: Child process error: %O', error);

        const errorEvent: ServerImplementationFailedEvent = {
          type: 'ServerImplementationFailed',
          data: {
            serverDirectory,
            error: error.message,
          },
          timestamp: new Date(),
          requestId: command.requestId,
          correlationId: command.correlationId,
        };
        debugResult('Returning error event due to process error');
        resolve(errorEvent);
      });
    });
  } catch (error) {
    debug('ERROR: Exception caught: %O', error);
    return {
      type: 'ServerImplementationFailed',
      data: {
        serverDirectory,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const implementServerCommandHandler: CommandHandler<ImplementServerCommand> = {
  name: 'ImplementServer',
  handle: async (command: ImplementServerCommand): Promise<void> => {
    debug('CommandHandler executing for ImplementServer');
    const result = await handleImplementServerCommand(command);
    if (result.type === 'ServerImplemented') {
      debug('Command handler completed: success');
      console.log(`✅ Server implementation completed successfully`);
      if (result.data.flowsImplemented > 0) {
        console.log(`   ${result.data.flowsImplemented} flows implemented`);
      }
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      console.error(`❌ Server implementation failed: ${result.data.error}`);
      process.exit(1);
    }
  },
};
