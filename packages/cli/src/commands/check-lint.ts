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

const handleLintCheck = async (
  resolvedDirectory: string,
  scope: 'slice' | 'project',
  fix: boolean,
  output: ReturnType<typeof createOutput>,
  analytics: Analytics,
): Promise<void> => {
  output.info(`🎨 Running ESLint on: ${resolvedDirectory}`);
  output.info(`   Scope: ${scope}`);
  if (fix) {
    output.info(`   Auto-fix: enabled`);
  }

  // Dynamic import to avoid circular dependency issues
  const { handleCheckLintCommand } = await import('@auto-engineer/backend-checks');

  const checkCommand = {
    type: 'CheckLint' as const,
    data: {
      targetDirectory: resolvedDirectory,
      scope,
      fix,
    },
    timestamp: new Date(),
    requestId: `check-lint-${Date.now()}`,
    correlationId: `check-lint-${Date.now()}`,
  };

  const result = await handleCheckLintCommand(checkCommand);

  if (result.type === 'LintCheckPassed') {
    output.success('✅ Lint check passed');
    output.info(`   Files checked: ${result.data.filesChecked}`);
    if (result.data.filesFixed !== undefined) {
      output.info(`   Files fixed: ${result.data.filesFixed}`);
    }
    await analytics.track({ command: 'check:lint:complete', success: true });
  } else {
    output.error(`❌ Lint check failed`);
    output.error(`   Errors: ${result.data.errorCount}`);
    output.error(`   Warnings: ${result.data.warningCount}`);
    if (result.data.filesWithIssues.length > 0) {
      output.error(`   Files with issues: ${result.data.filesWithIssues.join(', ')}`);
    }
    if (result.data.errors) {
      output.error(`   Details:\n${result.data.errors.substring(0, 500)}`);
    }
    await analytics.track({ command: 'check:lint:failed', success: false });
    process.exit(1);
  }
};

export const createCheckLintCommand = (config: Config, analytics: Analytics): Command => {
  const output = createOutput(config);
  const command = new Command('check:lint');

  command
    .description('Run ESLint checks on backend TypeScript code')
    .argument('[directory]', 'Path to the directory to lint (defaults to ./server)')
    .option('-d, --directory <path>', 'Target directory path (alternative to argument)')
    .option('-s, --scope <scope>', 'Lint scope: "slice" (target dir only) or "project" (entire project)', 'slice')
    .option('-f, --fix', 'Automatically fix problems where possible')
    .action(async (directoryArg?: string, options?: { directory?: string; scope?: string; fix?: boolean }) => {
      try {
        await analytics.track({ command: 'check:lint:start', success: true });

        const resolvedDirectory = determineTargetDirectory(directoryArg, options);
        const scope = options?.scope === 'project' ? 'project' : 'slice';
        const fix = Boolean(options?.fix);

        await handleLintCheck(resolvedDirectory, scope, fix, output, analytics);
      } catch (error) {
        await analytics.track({ command: 'check:lint:error', success: false });
        handleError(error as Error);
        process.exit(1);
      }
    });

  command.addHelpText(
    'after',
    `
Examples:
  $ auto check:lint
  $ auto check:lint ./server
  $ auto check:lint --directory ./backend
  $ auto check:lint ./server --fix
  $ auto check:lint ./server --scope project --fix

Notes:
  - By default lints only the specified directory (slice scope)
  - Use --scope project to lint the entire project
  - Use --fix to automatically fix problems where possible
  - Exit code 0 on success, 1 on failure
    `,
  );

  return command;
};
