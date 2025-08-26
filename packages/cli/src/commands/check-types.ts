import { Command } from 'commander';
import path from 'path';
import type { Analytics } from '../utils/analytics';
import { Config } from '../utils/config';
import { createOutput } from '../utils/terminal';
import { handleError } from '../utils/errors';

const determineTargetDirectory = (directoryArg?: string, options?: { directory?: string; scope?: string }): string => {
  let targetDirectory = './server';
  if (directoryArg !== undefined && directoryArg !== null && directoryArg.trim() !== '') {
    targetDirectory = directoryArg;
  } else if (options?.directory !== undefined && options.directory !== null && options.directory.trim() !== '') {
    targetDirectory = options.directory;
  }
  return path.resolve(targetDirectory);
};

const handleTypeCheck = async (
  resolvedDirectory: string,
  scope: 'slice' | 'project',
  output: ReturnType<typeof createOutput>,
  analytics: Analytics,
): Promise<void> => {
  output.info(`🔍 Running TypeScript type check on: ${resolvedDirectory}`);
  output.info(`   Scope: ${scope}`);

  // Dynamic import to avoid circular dependency issues
  const { handleCheckTypesCommand } = await import('@auto-engineer/backend-checks');

  const checkCommand = {
    type: 'CheckTypes' as const,
    data: {
      targetDirectory: resolvedDirectory,
      scope,
    },
    timestamp: new Date(),
    requestId: `check-types-${Date.now()}`,
    correlationId: `check-types-${Date.now()}`,
  };

  const result = await handleCheckTypesCommand(checkCommand);

  if (result.type === 'TypeCheckPassed') {
    output.success('✅ Type check passed');
    output.info(`   Checked ${result.data.checkedFiles} files`);
    await analytics.track({ command: 'check:types:complete', success: true });
  } else {
    output.error(`❌ Type check failed`);
    if (result.data.failedFiles.length > 0) {
      output.error(`   Failed files: ${result.data.failedFiles.join(', ')}`);
    }
    if (result.data.errors) {
      output.error(`   Errors:\n${result.data.errors.substring(0, 500)}`);
    }
    await analytics.track({ command: 'check:types:failed', success: false });
    process.exit(1);
  }
};

export const createCheckTypesCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);
  const command = new Command('check:types');

  command
    .description('Run TypeScript type checking on backend code')
    .argument('[directory]', 'Path to the directory to check (defaults to ./server)')
    .option('-d, --directory <path>', 'Target directory path (alternative to argument)')
    .option('-s, --scope <scope>', 'Check scope: "slice" (target dir only) or "project" (entire project)', 'slice')
    .action(async (directoryArg?: string, options?: { directory?: string; scope?: string }) => {
      try {
        await analytics.track({ command: 'check:types:start', success: true });

        const resolvedDirectory = determineTargetDirectory(directoryArg, options);
        const scope = options?.scope === 'project' ? 'project' : 'slice';

        await handleTypeCheck(resolvedDirectory, scope, output, analytics);
      } catch (error) {
        await analytics.track({ command: 'check:types:error', success: false });
        handleError(error as Error);
        process.exit(1);
      }
    });

  command.addHelpText(
    'after',
    `
Examples:
  $ auto check:types
  $ auto check:types ./server
  $ auto check:types --directory ./backend
  $ auto check:types ./server --scope project

Notes:
  - By default checks only the specified directory (slice scope)
  - Use --scope project to check the entire project
  - Exit code 0 on success, 1 on failure
    `,
  );

  return command;
};
