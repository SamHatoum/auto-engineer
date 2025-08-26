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

const handleTestsCheck = async (
  resolvedDirectory: string,
  scope: 'slice' | 'project',
  output: ReturnType<typeof createOutput>,
  analytics: Analytics,
): Promise<void> => {
  output.info(`🧪 Running tests on: ${resolvedDirectory}`);
  output.info(`   Scope: ${scope}`);

  // Dynamic import to avoid circular dependency issues
  const { handleCheckTestsCommand } = await import('@auto-engineer/backend-checks');

  const checkCommand = {
    type: 'CheckTests' as const,
    data: {
      targetDirectory: resolvedDirectory,
      scope,
    },
    timestamp: new Date(),
    requestId: `check-tests-${Date.now()}`,
    correlationId: `check-tests-${Date.now()}`,
  };

  const result = await handleCheckTestsCommand(checkCommand);

  if (result.type === 'TestsCheckPassed') {
    output.success('✅ All tests passed');
    output.info(`   Tests run: ${result.data.testsRun}`);
    output.info(`   Tests passed: ${result.data.testsPassed}`);
    await analytics.track({ command: 'check:tests:complete', success: true });
  } else {
    output.error(`❌ Tests failed`);
    output.error(`   Tests run: ${result.data.testsRun}`);
    output.error(`   Tests failed: ${result.data.testsFailed}`);
    if (result.data.failedTests.length > 0) {
      output.error(`   Failed files: ${result.data.failedTests.join(', ')}`);
    }
    if (result.data.errors) {
      output.error(`   Errors:\n${result.data.errors.substring(0, 500)}`);
    }
    await analytics.track({ command: 'check:tests:failed', success: false });
    process.exit(1);
  }
};

export const createCheckTestsCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);
  const command = new Command('check:tests');

  command
    .description('Run tests on backend code using Vitest')
    .argument('[directory]', 'Path to the directory to test (defaults to ./server)')
    .option('-d, --directory <path>', 'Target directory path (alternative to argument)')
    .option('-s, --scope <scope>', 'Test scope: "slice" (target dir only) or "project" (entire project)', 'slice')
    .action(async (directoryArg?: string, options?: { directory?: string; scope?: string }) => {
      try {
        await analytics.track({ command: 'check:tests:start', success: true });

        const resolvedDirectory = determineTargetDirectory(directoryArg, options);
        const scope = options?.scope === 'project' ? 'project' : 'slice';

        await handleTestsCheck(resolvedDirectory, scope, output, analytics);
      } catch (error) {
        await analytics.track({ command: 'check:tests:error', success: false });
        handleError(error as Error);
        process.exit(1);
      }
    });

  command.addHelpText(
    'after',
    `
Examples:
  $ auto check:tests
  $ auto check:tests ./server
  $ auto check:tests --directory ./backend
  $ auto check:tests ./server --scope project

Notes:
  - By default runs tests only in the specified directory (slice scope)
  - Use --scope project to run all project tests
  - Uses Vitest as the test runner
  - Exit code 0 on success, 1 on failure
    `,
  );

  return command;
};
