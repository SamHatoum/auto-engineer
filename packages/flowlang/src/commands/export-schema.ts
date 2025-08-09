#!/usr/bin/env node
import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export type ExportSchemaCommand = Command<
  'ExportSchema',
  {
    directory: string;
  }
>;

export type SchemaExportedEvent = Event<
  'SchemaExported',
  {
    directory: string;
    outputPath: string;
  }
>;

export type SchemaExportFailedEvent = Event<
  'SchemaExportFailed',
  {
    directory: string;
    error: string;
  }
>;

export async function handleExportSchemaCommand(
  command: ExportSchemaCommand,
): Promise<SchemaExportedEvent | SchemaExportFailedEvent> {
  const { directory } = command.data;

  try {
    // Run the helper script with tsx
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const helperScript = join(__dirname, 'export-schema-helper.js');

    return new Promise((resolve) => {
      const child = spawn('npx', ['tsx', helperScript, directory], {
        cwd: directory,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (stderr) {
          console.error(stderr);
        }

        try {
          const result = JSON.parse(stdout.trim()) as { success?: boolean; outputPath?: string; error?: string };
          if (result.success === true) {
            resolve({
              type: 'SchemaExported',
              data: {
                directory,
                outputPath: result.outputPath ?? '',
              },
              timestamp: new Date(),
              requestId: command.requestId,
              correlationId: command.correlationId,
            });
          } else {
            resolve({
              type: 'SchemaExportFailed',
              data: {
                directory,
                error: result.error ?? 'Unknown error',
              },
              timestamp: new Date(),
              requestId: command.requestId,
              correlationId: command.correlationId,
            });
          }
        } catch {
          resolve({
            type: 'SchemaExportFailed',
            data: {
              directory,
              error: code === 0 ? 'Failed to parse result' : `Process failed with code ${code}`,
            },
            timestamp: new Date(),
            requestId: command.requestId,
            correlationId: command.correlationId,
          });
        }
      });
    });
  } catch (error) {
    return {
      type: 'SchemaExportFailed',
      data: {
        directory,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const exportSchemaCommandHandler: CommandHandler<ExportSchemaCommand> = {
  name: 'ExportSchema',
  handle: async (command: ExportSchemaCommand): Promise<void> => {
    const result = await handleExportSchemaCommand(command);
    if (result.type === 'SchemaExported') {
      console.log(`✅ Flow schema written to: ${result.data.outputPath}`);
    } else {
      console.error(`❌ Failed to export schema: ${result.data.error}`);
      process.exit(1);
    }
  },
};
