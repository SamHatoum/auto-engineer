import { type Command, type Event, defineCommandHandler } from '@auto-engineer/message-bus';
import path from 'path';
import { execa } from 'execa';
import fg from 'fast-glob';
import { access } from 'fs/promises';
import createDebug from 'debug';

const debug = createDebug('auto:server-checks:tests');
const debugHandler = createDebug('auto:server-checks:tests:handler');
const debugProcess = createDebug('auto:server-checks:tests:process');
const debugResult = createDebug('auto:server-checks:tests:result');

export type CheckTestsCommand = Command<
  'CheckTests',
  {
    targetDirectory: string;
    scope?: 'slice' | 'project'; // slice runs only tests in target dir, project runs all tests
  }
>;

export type TestsCheckPassedEvent = Event<
  'TestsCheckPassed',
  {
    targetDirectory: string;
    testsRun: number;
    testsPassed: number;
  }
>;

export type TestsCheckFailedEvent = Event<
  'TestsCheckFailed',
  {
    targetDirectory: string;
    errors: string;
    failedTests: string[];
    testsRun: number;
    testsFailed: number;
  }
>;

export type CheckTestsEvents = TestsCheckPassedEvent | TestsCheckFailedEvent;

export const commandHandler = defineCommandHandler<
  CheckTestsCommand,
  (command: CheckTestsCommand) => Promise<TestsCheckPassedEvent | TestsCheckFailedEvent>
>({
  name: 'CheckTests',
  alias: 'check:tests',
  description: 'Run Vitest test suites',
  category: 'check',
  icon: 'flask-conical',
  fields: {
    targetDirectory: {
      description: 'Directory containing tests',
      required: true,
    },
    scope: {
      description: 'Test scope: slice (default) or project',
      required: false,
    },
  },
  examples: [
    '$ auto check:tests --target-directory=./server',
    '$ auto check:tests --target-directory=./server --scope=project',
  ],
  events: ['TestsCheckPassed', 'TestsCheckFailed'],
  // eslint-disable-next-line complexity
  handle: async (command: Command): Promise<TestsCheckPassedEvent | TestsCheckFailedEvent> => {
    const typedCommand = command as CheckTestsCommand;
    debug('CommandHandler executing for CheckTests');
    const { targetDirectory, scope = 'slice' } = typedCommand.data;

    debug('Handling CheckTestsCommand');
    debug('  Target directory: %s', targetDirectory);
    debug('  Scope: %s', scope);
    debug('  Request ID: %s', typedCommand.requestId);
    debug('  Correlation ID: %s', typedCommand.correlationId ?? 'none');

    try {
      const targetDir = path.resolve(targetDirectory);
      const projectRoot = await findProjectRoot(targetDir);

      debugHandler('Resolved paths:');
      debugHandler('  Target directory: %s', targetDir);
      debugHandler('  Project root: %s', projectRoot);

      // Find test files
      const testPattern = scope === 'slice' ? path.join(targetDir, '**/*.specs.ts') : '**/*.specs.ts';

      const testFiles = await fg([testPattern], {
        cwd: projectRoot,
        absolute: true,
      });

      if (testFiles.length === 0) {
        debugResult('No test files found');
        return {
          type: 'TestsCheckPassed',
          data: {
            targetDirectory,
            testsRun: 0,
            testsPassed: 0,
          },
          timestamp: new Date(),
          requestId: typedCommand.requestId,
          correlationId: typedCommand.correlationId,
        };
      }

      debugProcess('Running tests with Vitest...');
      debugProcess('Test files: %d', testFiles.length);

      // Run tests with Vitest
      const args = ['vitest', 'run', '--reporter=verbose'];

      if (scope === 'slice') {
        // Run only tests in the target directory
        args.push(targetDir);
      }

      const result = await execa('npx', args, {
        cwd: projectRoot,
        stdio: 'pipe',
        reject: false,
        env: {
          ...process.env,
          CI: 'true', // Ensures non-interactive mode
        },
      });

      const output = (result.stdout ?? '') + (result.stderr ?? '');
      const { failedTests, testsRun, testsPassed, testsFailed } = parseVitestOutput(output);

      if (result.exitCode !== 0 || failedTests.length > 0) {
        debugResult('Tests failed');
        debugResult('Failed tests: %d', testsFailed);
        debugResult('Failed files: %s', failedTests.join(', '));

        const errorMessages = extractTestErrors(output);

        return {
          type: 'TestsCheckFailed',
          data: {
            targetDirectory,
            errors: errorMessages || output.substring(0, 2000),
            failedTests: failedTests.map((f) => path.relative(targetDir, f)),
            testsRun,
            testsFailed,
          },
          timestamp: new Date(),
          requestId: typedCommand.requestId,
          correlationId: typedCommand.correlationId,
        };
      }

      debugResult('All tests passed');
      debugResult('Tests run: %d', testsRun);
      debugResult('Tests passed: %d', testsPassed);

      return {
        type: 'TestsCheckPassed',
        data: {
          targetDirectory,
          testsRun,
          testsPassed,
        },
        timestamp: new Date(),
        requestId: typedCommand.requestId,
        correlationId: typedCommand.correlationId,
      };
    } catch (error) {
      debug('ERROR: Exception caught: %O', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        type: 'TestsCheckFailed',
        data: {
          targetDirectory,
          errors: errorMessage,
          failedTests: [],
          testsRun: 0,
          testsFailed: 0,
        },
        timestamp: new Date(),
        requestId: typedCommand.requestId,
        correlationId: typedCommand.correlationId,
      };
    }
  },
});

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

function stripAnsiCodes(text: string): string {
  const ansiEscape = String.fromCharCode(27);
  const ansiPattern = new RegExp(`${ansiEscape}\\[[0-9;]*m`, 'g');
  return text.replace(ansiPattern, '');
}

function extractTestErrors(output: string): string {
  const lines = output.split('\n');
  const errorSections: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = stripAnsiCodes(line);

    if (
      cleanLine.includes('FAIL') ||
      cleanLine.includes('AssertionError') ||
      cleanLine.includes('Error:') ||
      (cleanLine.includes('expected') && cleanLine.includes('to match'))
    ) {
      const contextStart = Math.max(0, i - 2);
      const contextEnd = Math.min(lines.length, i + 30);
      const errorBlock = lines.slice(contextStart, contextEnd);

      const cleanedBlock = errorBlock
        .map((l) => stripAnsiCodes(l))
        .filter((l) => {
          const trimmed = l.trim();
          return trimmed.length > 0 && !trimmed.startsWith('✓') && !trimmed.match(/^\d+ (passed|tests?)/);
        });

      errorSections.push(cleanedBlock.join('\n'));

      i = contextEnd;
    }
  }

  return errorSections.join('\n\n---\n\n');
}

function parseVitestOutput(output: string): {
  failedTests: string[];
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
} {
  const failedTests: string[] = [];
  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Parse test results from output
  const failPattern = /FAIL\s+(.+\.specs?\.ts)/g;

  for (const match of output.matchAll(failPattern)) {
    failedTests.push(match[1]);
  }

  // Try to extract test counts from summary
  const summaryMatch = output.match(/Tests\s+(\d+)\s+passed(?:\s+\|\s+(\d+)\s+failed)?/);
  if (summaryMatch) {
    testsPassed = parseInt(summaryMatch[1], 10);
    testsFailed = summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0;
    testsRun = testsPassed + testsFailed;
  } else {
    // Fallback: count PASS and FAIL lines
    const passMatches = output.match(/PASS/g);
    const failMatches = output.match(/FAIL/g);
    testsPassed = passMatches ? passMatches.length : 0;
    testsFailed = failMatches ? failMatches.length : 0;
    testsRun = testsPassed + testsFailed;
  }

  return { failedTests, testsRun, testsPassed, testsFailed };
}

// Default export for CLI usage - just export the handler
export default commandHandler;
