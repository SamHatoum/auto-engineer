import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import { getFs } from './filestore.node.js';
import createDebug from 'debug';

const debug = createDebug('auto:narrative:export-schema');
if ('color' in debug && typeof debug === 'object') {
  (debug as { color: string }).color = '4';
}

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

export type ExportSchemaEvents = SchemaExportedEvent | SchemaExportFailedEvent;

export const commandHandler = defineCommandHandler({
  name: 'ExportSchema',
  alias: 'export:schema',
  description: 'Export flow schemas to context directory',
  category: 'export',
  icon: 'download',
  events: ['SchemaExported', 'SchemaExportFailed'],
  fields: {
    directory: {
      description: 'Context directory path',
      required: true,
    },
  },
  examples: ['$ auto export:schema --directory=./.context'],
  handle: async (command: Command): Promise<SchemaExportedEvent | SchemaExportFailedEvent> => {
    const typedCommand = command as ExportSchemaCommand;
    const result = await handleExportSchemaCommand(typedCommand);
    if (result.type === 'SchemaExported') {
      debug('✅ Flow schema written to: %s', result.data.outputPath);
    } else {
      debug('❌ Failed to export schema: %s', result.data.error);
    }
    return result;
  },
});

export async function handleExportSchemaCommand(
  command: ExportSchemaCommand,
): Promise<SchemaExportedEvent | SchemaExportFailedEvent> {
  const { directory } = command.data;

  try {
    // Run the helper script with tsx
    const fs = await getFs();
    const __dirname = fs.dirname(new URL(import.meta.url).href);
    const helperScript = fs.join(__dirname, 'export-schema-helper.js');
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const child = spawn('npx', ['tsx', helperScript, directory], {
        cwd: directory,
        stdio: ['inherit', 'pipe', 'inherit'], // Let stderr go directly to parent process
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV ?? 'development',
          DEBUG: process.env.DEBUG, // Explicitly pass DEBUG env var
          DEBUG_COLORS: process.env.DEBUG_COLORS, // Pass color settings
          DEBUG_HIDE_DATE: 'true', // Always hide timestamps in child process to match parent
        },
        shell: true,
      });

      let stdout = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Extract JSON from stdout - look for the last line that starts with '{'
          const lines = stdout.trim().split('\n');
          const jsonLine = lines.reverse().find((line) => line.trim().startsWith('{'));

          if (jsonLine == null) {
            throw new Error('No JSON output found');
          }

          const result = JSON.parse(jsonLine) as { success?: boolean; outputPath?: string; error?: string };
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: 'SchemaExportFailed',
      data: {
        directory,
        error: message,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

// Default export is the command handler
export default commandHandler;
