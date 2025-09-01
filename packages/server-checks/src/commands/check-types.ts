import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import path from 'path';
import { execa } from 'execa';
import fg from 'fast-glob';
import { access } from 'fs/promises';
import createDebug from 'debug';

const debug = createDebug('server-checks:types');
const debugHandler = createDebug('server-checks:types:handler');
const debugProcess = createDebug('server-checks:types:process');
const debugResult = createDebug('server-checks:types:result');

export type CheckTypesCommand = Command<
  'CheckTypes',
  {
    targetDirectory: string;
    scope?: 'slice' | 'project';
  }
>;

export type TypeCheckPassedEvent = Event<
  'TypeCheckPassed',
  {
    targetDirectory: string;
    checkedFiles: number;
  }
>;

export type TypeCheckFailedEvent = Event<
  'TypeCheckFailed',
  {
    targetDirectory: string;
    errors: string;
    failedFiles: string[];
  }
>;

export const commandHandler = defineCommandHandler<CheckTypesCommand>({
  name: 'CheckTypes',
  alias: 'check:types',
  description: 'TypeScript type checking',
  category: 'check',
  fields: {
    targetDirectory: {
      description: 'Directory to check',
      required: true,
    },
    scope: {
      description: 'Check scope: slice (default) or project',
      required: false,
    },
  },
  examples: [
    '$ auto check:types --target-directory=./server',
    '$ auto check:types --target-directory=./server --scope=project',
  ],
  // eslint-disable-next-line complexity
  handle: async (command: CheckTypesCommand): Promise<TypeCheckPassedEvent | TypeCheckFailedEvent> => {
    debug('CommandHandler executing for CheckTypes');
    const { targetDirectory, scope = 'slice' } = command.data;

    debug('Handling CheckTypesCommand');
    debug('  Target directory: %s', targetDirectory);
    debug('  Scope: %s', scope);
    debug('  Request ID: %s', command.requestId);
    debug('  Correlation ID: %s', command.correlationId ?? 'none');

    try {
      const targetDir = path.resolve(targetDirectory);
      const projectRoot = await findProjectRoot(targetDir);

      debugHandler('Resolved paths:');
      debugHandler('  Target directory: %s', targetDir);
      debugHandler('  Project root: %s', projectRoot);

      debugProcess('Running TypeScript compiler check...');

      const result = await execa('npx', ['tsc', '--noEmit'], {
        cwd: projectRoot,
        stdio: 'pipe',
        reject: false,
      });

      const output = (result.stdout ?? '') + (result.stderr ?? '');

      if (result.exitCode !== 0 || output.includes('error')) {
        // Filter errors to only those in the target directory if scope is 'slice'
        const failedFiles = extractFailedFiles(output, projectRoot, scope === 'slice' ? targetDir : undefined);

        if (scope === 'slice') {
          // Filter output to only show errors from target directory
          const relativePath = path.relative(projectRoot, targetDir);
          const filteredOutput = output
            .split('\n')
            .filter((line) => {
              const hasError = line.includes('error TS') || line.includes('): error');
              const notNodeModules = !line.includes('node_modules');
              const hasTargetPath = line.includes(relativePath) || line.includes(targetDir);
              return hasError && notNodeModules && hasTargetPath;
            })
            .join('\n');

          if (filteredOutput.trim() === '') {
            // No errors in the target directory specifically
            const files = await fg(['**/*.ts'], { cwd: targetDir });

            debugResult('Type check passed (no errors in target directory)');
            debugResult('Checked files: %d', files.length);

            return {
              type: 'TypeCheckPassed',
              data: {
                targetDirectory,
                checkedFiles: files.length,
              },
              timestamp: new Date(),
              requestId: command.requestId,
              correlationId: command.correlationId,
            };
          }

          debugResult('Type check failed');
          debugResult('Failed files: %d', failedFiles.length);
          debugResult('Errors: %s', filteredOutput.substring(0, 500));

          return {
            type: 'TypeCheckFailed',
            data: {
              targetDirectory,
              errors: filteredOutput,
              failedFiles: failedFiles.map((f) => path.relative(targetDir, f)),
            },
            timestamp: new Date(),
            requestId: command.requestId,
            correlationId: command.correlationId,
          };
        } else {
          // Project scope - return all errors
          debugResult('Type check failed (project scope)');
          debugResult('Failed files: %d', failedFiles.length);

          return {
            type: 'TypeCheckFailed',
            data: {
              targetDirectory,
              errors: output,
              failedFiles: failedFiles.map((f) => path.relative(projectRoot, f)),
            },
            timestamp: new Date(),
            requestId: command.requestId,
            correlationId: command.correlationId,
          };
        }
      }

      // Success case
      const files = await fg(['**/*.ts'], {
        cwd: scope === 'slice' ? targetDir : projectRoot,
      });

      debugResult('Type check passed');
      debugResult('Checked files: %d', files.length);

      return {
        type: 'TypeCheckPassed',
        data: {
          targetDirectory,
          checkedFiles: files.length,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    } catch (error) {
      debug('ERROR: Exception caught: %O', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        type: 'TypeCheckFailed',
        data: {
          targetDirectory,
          errors: errorMessage,
          failedFiles: [],
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }
  },
});

async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    try {
      await access(path.join(dir, 'package.json'));
      await access(path.join(dir, 'tsconfig.json'));
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error('Could not find project root (no package.json or tsconfig.json found)');
}

function extractFailedFiles(output: string, rootDir: string, targetDir?: string): string[] {
  const failedFiles = new Set<string>();

  const patterns = [
    /^([^:]+\.ts)\(\d+,\d+\): error/gm,
    /error TS\d+: .+ '([^']+\.ts)'/gm,
    /^([^:]+\.ts):\d+:\d+ - error/gm,
  ];

  for (const pattern of patterns) {
    for (const match of output.matchAll(pattern)) {
      const filePath = match[1] ? path.resolve(rootDir, match[1]) : '';

      const notNodeModules = !filePath.includes('node_modules');
      const inTarget = targetDir === undefined || filePath.startsWith(targetDir);

      if (notNodeModules && inTarget) {
        failedFiles.add(filePath);
      }
    }
  }

  return Array.from(failedFiles);
}

// Default export for CLI usage - just export the handler
export default commandHandler;
