import { Command } from 'commander';
import path from 'path';
import type { Analytics } from '../utils/analytics';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';

const determineServerDirectory = (serverDirectoryArg?: string, options?: { directory?: string }): string => {
  let serverDirectory = './server';
  if (serverDirectoryArg !== undefined && serverDirectoryArg !== null && serverDirectoryArg.trim() !== '') {
    serverDirectory = serverDirectoryArg;
  } else if (options?.directory !== undefined && options.directory !== null && options.directory.trim() !== '') {
    serverDirectory = options.directory;
  }
  return path.resolve(serverDirectory);
};

const handleServerImplementation = async (
  resolvedDirectory: string,
  output: ReturnType<typeof createOutput>,
  analytics: Analytics,
): Promise<void> => {
  output.info(`🚀 Implementing server flows in: ${resolvedDirectory}`);

  // Dynamic import to avoid circular dependency issues
  const { handleImplementServerCommand } = await import('@auto-engineer/emmett-generator');

  const implementCommand = {
    type: 'ImplementServer' as const,
    data: {
      serverDirectory: resolvedDirectory,
    },
    timestamp: new Date(),
    requestId: `implement-server-${Date.now()}`,
    correlationId: `implement-server-${Date.now()}`,
  };

  const result = await handleImplementServerCommand(implementCommand);

  if (result.type === 'ServerImplemented') {
    output.success('✅ Server implementation completed successfully');
    if (result.data.flowsImplemented > 0) {
      output.info(`   ${result.data.flowsImplemented} flows implemented`);
    }
    await analytics.track({ command: 'implement:server:complete', success: true });
  } else {
    output.error(`❌ Server implementation failed: ${result.data.error}`);
    await analytics.track({ command: 'implement:server:failed', success: false });
    process.exit(1);
  }
};

export const createImplementServerCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);
  const command = new Command('implement:server');

  command
    .description('Implement server flows using AI')
    .argument('[server-directory]', 'Path to the server directory (defaults to ./server)')
    .option('-d, --directory <path>', 'Server directory path (alternative to argument)')
    .action(async (serverDirectoryArg?: string, options?: { directory?: string }) => {
      try {
        await analytics.track({ command: 'implement:server:start', success: true });

        const resolvedDirectory = determineServerDirectory(serverDirectoryArg, options);
        await handleServerImplementation(resolvedDirectory, output, analytics);
      } catch (error) {
        await analytics.track({ command: 'implement:server:error', success: false });
        handleError(error as Error);
        process.exit(1);
      }
    });

  command.addHelpText(
    'after',
    `
Examples:
  $ auto-engineer implement:server
  $ auto-engineer implement:server ./my-server
  $ auto-engineer implement:server --directory ./backend/server
`,
  );

  return command;
};
