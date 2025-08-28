#!/usr/bin/env node
import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import { getFs } from './filestore.node';

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
    const fs = await getFs();
    const __dirname = fs.dirname(new URL(import.meta.url).href);
    const helperScript = fs.join(__dirname, 'export-schema-helper.js');
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const child = spawn('npx', ['tsx', helperScript, directory], {
        cwd: directory,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
        shell: true,
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

// CLI arguments interface
interface CliArgs {
  contextDir?: string;
  flowsDir?: string;
  [key: string]: unknown;
}

// Type guard to check if it's an ExportSchemaCommand
function isExportSchemaCommand(obj: unknown): obj is ExportSchemaCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    (obj as { type: unknown }).type === 'ExportSchema'
  );
}

// Export for CLI usage
export default async (args: ExportSchemaCommand | CliArgs) => {
  // Handle the CLI args - expecting contextDir and flowsDir
  let contextDir: string;
  let flowsDir: string;

  if (isExportSchemaCommand(args)) {
    const data = args.data as unknown as { contextDir: string; flowsDir: string };
    contextDir = data.contextDir;
    flowsDir = data.flowsDir;
  } else {
    contextDir = args.contextDir ?? './.context';
    flowsDir = args.flowsDir ?? './flows';
  }

  console.log(`Exporting schema from ${flowsDir} to ${contextDir}`);

  // Run the helper script with proper arguments
  const childProcessModule = await import('child_process');
  const pathModule = await import('path');
  const urlModule = await import('url');

  const __dirname = pathModule.dirname(urlModule.fileURLToPath(import.meta.url));
  const helperScript = pathModule.join(__dirname, 'export-schema-helper.js');

  return new Promise<void>((resolve, reject) => {
    const child = childProcessModule.spawn('npx', ['tsx', helperScript, contextDir, flowsDir], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' },
      shell: true,
    });

    const handleClose = (code: number | null) => {
      if (code === 0) {
        console.log(`✅ Schema exported successfully`);
        resolve();
      } else {
        console.error(`❌ Failed to export schema (exit code: ${code ?? 'unknown'})`);
        reject(new Error(`Export schema failed with exit code ${code ?? 'unknown'}`));
      }
    };

    const handleError = (err: Error) => {
      console.error('❌ Failed to run export schema:', err);
      reject(err);
    };

    child.on('close', handleClose);
    child.on('error', handleError);
  });
};
