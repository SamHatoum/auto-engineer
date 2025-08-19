#!/usr/bin/env node
import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

  try {
    const serverRoot = path.resolve(serverDirectory);
    const flowsDir = path.join(serverRoot, 'src', 'domain', 'flows');

    if (!existsSync(flowsDir)) {
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

    return new Promise((resolve) => {
      const child = spawn('npx', ['tsx', serverImplementerPath, serverRoot], {
        cwd: serverRoot,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output); // Pass through the output
      });

      child.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output); // Pass through the error output
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Try to extract the number of flows implemented from output
          const flowsMatch = stdout.match(/(\d+)\s+flows?\s+implemented/i);
          const flowsImplemented = flowsMatch ? parseInt(flowsMatch[1], 10) : 0;

          resolve({
            type: 'ServerImplemented',
            data: {
              serverDirectory,
              flowsImplemented,
            },
            timestamp: new Date(),
            requestId: command.requestId,
            correlationId: command.correlationId,
          });
        } else {
          resolve({
            type: 'ServerImplementationFailed',
            data: {
              serverDirectory,
              error: stderr || `Process exited with code ${code}`,
            },
            timestamp: new Date(),
            requestId: command.requestId,
            correlationId: command.correlationId,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          type: 'ServerImplementationFailed',
          data: {
            serverDirectory,
            error: error.message,
          },
          timestamp: new Date(),
          requestId: command.requestId,
          correlationId: command.correlationId,
        });
      });
    });
  } catch (error) {
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
    const result = await handleImplementServerCommand(command);
    if (result.type === 'ServerImplemented') {
      console.log(`✅ Server implementation completed successfully`);
      if (result.data.flowsImplemented > 0) {
        console.log(`   ${result.data.flowsImplemented} flows implemented`);
      }
    } else {
      console.error(`❌ Server implementation failed: ${result.data.error}`);
      process.exit(1);
    }
  },
};
