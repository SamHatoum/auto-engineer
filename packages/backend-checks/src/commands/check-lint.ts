import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import path from 'path';
import { execa } from 'execa';
import fg from 'fast-glob';
import { access } from 'fs/promises';
import createDebug from 'debug';

const debug = createDebug('backend-checks:lint');
const debugHandler = createDebug('backend-checks:lint:handler');
const debugProcess = createDebug('backend-checks:lint:process');
const debugResult = createDebug('backend-checks:lint:result');

export type CheckLintCommand = Command<
  'CheckLint',
  {
    targetDirectory: string;
    scope?: 'slice' | 'project'; // slice lints only target dir, project lints all
    fix?: boolean; // Whether to auto-fix issues
  }
>;

export type LintCheckPassedEvent = Event<
  'LintCheckPassed',
  {
    targetDirectory: string;
    filesChecked: number;
    filesFixed?: number;
  }
>;

export type LintCheckFailedEvent = Event<
  'LintCheckFailed',
  {
    targetDirectory: string;
    errors: string;
    filesWithIssues: string[];
    errorCount: number;
    warningCount: number;
  }
>;

async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    try {
      await access(path.join(dir, 'package.json'));
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error('Could not find project root (no package.json found)');
}

function parseFilesWithIssues(output: string): string[] {
  const filesWithIssues: string[] = [];
  const filePattern = /^([^\s].+\.ts)$/gm;
  for (const match of output.matchAll(filePattern)) {
    const filePath = match[1];
    if (!filePath.includes('node_modules')) {
      filesWithIssues.push(filePath);
    }
  }
  return [...new Set(filesWithIssues)]; // Remove duplicates
}

function parseErrorCounts(output: string): { errorCount: number; warningCount: number } {
  const summaryMatch = output.match(/✖\s+(\d+)\s+problem[s]?\s+\((\d+)\s+error[s]?,?\s*(\d+)?\s*warning[s]?\)/);
  if (summaryMatch) {
    return {
      errorCount: parseInt(summaryMatch[2], 10),
      warningCount: summaryMatch[3] ? parseInt(summaryMatch[3], 10) : 0,
    };
  }

  // Fallback: count individual errors and warnings
  const errorMatches = output.match(/\berror\b/gi);
  const warningMatches = output.match(/\bwarning\b/gi);
  return {
    errorCount: errorMatches ? errorMatches.length : 0,
    warningCount: warningMatches ? warningMatches.length : 0,
  };
}

function extractFormattedErrors(output: string): string {
  const errorLines: string[] = [];
  const lines = output.split('\n');
  let inFileSection = false;

  for (const line of lines) {
    if (line.match(/^[^\s].+\.ts$/)) {
      inFileSection = true;
      errorLines.push(line);
    } else if (inFileSection && line.match(/^\s+\d+:\d+/)) {
      errorLines.push(line);
    } else if (line.trim() === '') {
      inFileSection = false;
    }
  }
  return errorLines.join('\n');
}

function parseEslintOutput(output: string): {
  filesWithIssues: string[];
  errorCount: number;
  warningCount: number;
  formattedErrors: string;
} {
  const filesWithIssues = parseFilesWithIssues(output);
  const { errorCount, warningCount } = parseErrorCounts(output);
  const formattedErrors = extractFormattedErrors(output);

  return {
    filesWithIssues,
    errorCount,
    warningCount,
    formattedErrors,
  };
}

// eslint-disable-next-line complexity
async function handleCheckLintCommandInternal(
  command: CheckLintCommand,
): Promise<LintCheckPassedEvent | LintCheckFailedEvent> {
  const { targetDirectory, scope = 'slice', fix = false } = command.data;

  debug('Handling CheckLintCommand');
  debug('  Target directory: %s', targetDirectory);
  debug('  Scope: %s', scope);
  debug('  Auto-fix: %s', fix);
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');

  try {
    const targetDir = path.resolve(targetDirectory);
    const projectRoot = await findProjectRoot(targetDir);

    debugHandler('Resolved paths:');
    debugHandler('  Target directory: %s', targetDir);
    debugHandler('  Project root: %s', projectRoot);

    // Find TypeScript files to lint
    const pattern = scope === 'slice' ? path.join(targetDir, '**/*.ts') : 'src/**/*.ts';

    const files = await fg([pattern], {
      cwd: projectRoot,
      absolute: false,
    });

    if (files.length === 0) {
      debugResult('No TypeScript files found to lint');
      return {
        type: 'LintCheckPassed',
        data: {
          targetDirectory,
          filesChecked: 0,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    debugProcess('Running ESLint...');
    debugProcess('Files to check: %d', files.length);

    // Build ESLint command
    const args = ['eslint'];

    if (scope === 'slice') {
      // Lint only files in target directory
      const relativePath = path.relative(projectRoot, targetDir);
      args.push(`${relativePath}/**/*.ts`);
    } else {
      args.push('src/**/*.ts');
    }

    args.push('--max-warnings', '0');

    // Look for ESLint config
    const configPath = path.join(projectRoot, 'eslint.config.ts');
    if (
      await access(configPath)
        .then(() => true)
        .catch(() => false)
    ) {
      args.push('--config', configPath);
    } else {
      // Try parent directory config
      const parentConfig = path.join(projectRoot, '..', '..', 'eslint.config.ts');
      if (
        await access(parentConfig)
          .then(() => true)
          .catch(() => false)
      ) {
        args.push('--config', parentConfig);
      }
    }

    if (fix) {
      args.push('--fix');
    }

    const result = await execa('npx', args, {
      cwd: projectRoot,
      stdio: 'pipe',
      reject: false,
    });

    const output = (result.stdout ?? '') + (result.stderr ?? '');

    if (result.exitCode !== 0 && output.includes('error')) {
      const { filesWithIssues, errorCount, warningCount, formattedErrors } = parseEslintOutput(output);

      debugResult('Lint check failed');
      debugResult('Files with issues: %d', filesWithIssues.length);
      debugResult('Errors: %d, Warnings: %d', errorCount, warningCount);

      return {
        type: 'LintCheckFailed',
        data: {
          targetDirectory,
          errors: formattedErrors || output.substring(0, 1000),
          filesWithIssues: filesWithIssues.map((f) => {
            // Make paths relative to target directory
            if (path.isAbsolute(f)) {
              return path.relative(targetDir, f);
            }
            return f;
          }),
          errorCount,
          warningCount,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    debugResult('Lint check passed');
    debugResult('Files checked: %d', files.length);

    interface SuccessData {
      targetDirectory: string;
      filesChecked: number;
      filesFixed?: number;
    }

    const successData: SuccessData = {
      targetDirectory,
      filesChecked: files.length,
    };

    if (fix) {
      // Count fixed files by checking the output for "fixed" messages
      const fixedMatch = output.match(/(\d+)\s+error[s]?\s+.*potentially fixable/);
      if (fixedMatch) {
        successData.filesFixed = parseInt(fixedMatch[1], 10);
      }
    }

    return {
      type: 'LintCheckPassed',
      data: successData,
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } catch (error) {
    debug('ERROR: Exception caught: %O', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      type: 'LintCheckFailed',
      data: {
        targetDirectory,
        errors: errorMessage,
        filesWithIssues: [],
        errorCount: 0,
        warningCount: 0,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  }
}

export const checkLintCommandHandler: CommandHandler<CheckLintCommand> = {
  name: 'CheckLint',
  handle: async (command: CheckLintCommand): Promise<void> => {
    debug('CommandHandler executing for CheckLint');
    const result = await handleCheckLintCommandInternal(command);

    if (result.type === 'LintCheckPassed') {
      debug('Command handler completed: success');
      console.log(`✅ Lint check passed`);
      console.log(`   Files checked: ${result.data.filesChecked}`);
      if (result.data.filesFixed !== undefined) {
        console.log(`   Files fixed: ${result.data.filesFixed}`);
      }
    } else {
      debug('Command handler completed: failure');
      console.error(`❌ Lint check failed`);
      console.error(`   Errors: ${result.data.errorCount}`);
      console.error(`   Warnings: ${result.data.warningCount}`);
      if (result.data.filesWithIssues.length > 0) {
        console.error(`   Files with issues: ${result.data.filesWithIssues.join(', ')}`);
      }
      if (result.data.errors) {
        console.error(`   Details:\n${result.data.errors.substring(0, 500)}`);
      }
      process.exit(1);
    }
  },
};

// CLI arguments interface
interface CliArgs {
  _: string[];
  scope?: 'slice' | 'project';
  fix?: boolean;
  [key: string]: unknown;
}

// Type guard
function isCheckLintCommand(obj: unknown): obj is CheckLintCommand {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    (obj as { type: unknown }).type === 'CheckLint'
  );
}

// Default export for CLI usage
export default async (commandOrArgs: CheckLintCommand | CliArgs) => {
  const command = isCheckLintCommand(commandOrArgs)
    ? commandOrArgs
    : {
        type: 'CheckLint' as const,
        data: {
          targetDirectory: commandOrArgs._?.[0] ?? 'server',
          scope: commandOrArgs.scope ?? 'slice',
          fix: commandOrArgs.fix ?? false,
        },
        timestamp: new Date(),
      };

  const result = await handleCheckLintCommandInternal(command);
  if (result.type === 'LintCheckPassed') {
    console.log(`✅ Lint check passed`);
    console.log(`   Files checked: ${result.data.filesChecked}`);
    if (result.data.filesFixed !== undefined) {
      console.log(`   Files fixed: ${result.data.filesFixed}`);
    }
  } else {
    console.error(`❌ Lint check failed`);
    console.error(`   Errors: ${result.data.errorCount}`);
    console.error(`   Warnings: ${result.data.warningCount}`);
    if (result.data.filesWithIssues.length > 0) {
      console.error(`   Files with issues: ${result.data.filesWithIssues.join(', ')}`);
    }
    if (result.data.errors) {
      console.error(`   Details:\n${result.data.errors.substring(0, 500)}`);
    }
    process.exit(1);
  }
};
