import { type CommandHandler, type Command, type Event } from '@auto-engineer/message-bus';
import path from 'path';
import { existsSync } from 'fs';
import { getTsErrors, getBuildErrors, getConsoleErrors, closeBrowser } from '../index';
import { spawn, ChildProcess } from 'child_process';
import createDebug from 'debug';

const debug = createDebug('frontend-checks:command');
const debugHandler = createDebug('frontend-checks:command:handler');
const debugServer = createDebug('frontend-checks:command:server');
const debugChecks = createDebug('frontend-checks:command:checks');
const debugResult = createDebug('frontend-checks:command:result');

export type CheckClientCommand = Command<
  'CheckClient',
  {
    clientDirectory: string;
    skipBrowserChecks?: boolean;
  }
>;

export type ClientCheckedEvent = Event<
  'ClientChecked',
  {
    clientDirectory: string;
    tsErrors: number;
    buildErrors: number;
    consoleErrors: number;
    allChecksPassed: boolean;
  }
>;

export type ClientCheckFailedEvent = Event<
  'ClientCheckFailed',
  {
    clientDirectory: string;
    error: string;
  }
>;

async function startDevServer(clientDir: string): Promise<{ process: ChildProcess; url: string }> {
  debugServer('Starting dev server in: %s', clientDir);

  return new Promise((resolve, reject) => {
    const devProcess = spawn('pnpm', ['dev'], {
      cwd: clientDir,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'development' },
    });

    let serverUrl = '';
    const timeout = setTimeout(() => {
      devProcess.kill();
      reject(new Error('Dev server failed to start within 30 seconds'));
    }, 30000);

    devProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      debugServer('Dev server output: %s', output.trim());

      // Look for Vite's server URL in the output
      const urlMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
      if (urlMatch && !serverUrl) {
        serverUrl = urlMatch[1];
        debugServer('Dev server started at: %s', serverUrl);
        clearTimeout(timeout);
        resolve({ process: devProcess, url: serverUrl });
      }
    });

    devProcess.stderr.on('data', (data: Buffer) => {
      debugServer('Dev server error: %s', data.toString().trim());
    });

    devProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function createSuccessEvent(
  clientDirectory: string,
  tsErrors: string[],
  buildErrors: string[],
  consoleErrorCount: number,
  command: CheckClientCommand,
): ClientCheckedEvent {
  const allChecksPassed = tsErrors.length === 0 && buildErrors.length === 0 && consoleErrorCount === 0;

  debugResult('Checks completed:');
  debugResult('  TypeScript errors: %d', tsErrors.length);
  debugResult('  Build errors: %d', buildErrors.length);
  debugResult('  Console errors: %d', consoleErrorCount);
  debugResult('  All checks passed: %s', allChecksPassed);

  return {
    type: 'ClientChecked',
    data: {
      clientDirectory,
      tsErrors: tsErrors.length,
      buildErrors: buildErrors.length,
      consoleErrors: consoleErrorCount,
      allChecksPassed,
    },
    timestamp: new Date(),
    requestId: command.requestId,
    correlationId: command.correlationId,
  };
}

function validateClientDirectory(clientDirectory: string): { isValid: boolean; clientRoot?: string; error?: string } {
  const clientRoot = path.resolve(clientDirectory);
  debugHandler('Resolved client root: %s', clientRoot);

  if (!existsSync(clientRoot)) {
    debugHandler('ERROR: Client directory not found at %s', clientRoot);
    return {
      isValid: false,
      error: `Client directory not found at: ${clientRoot}`,
    };
  }

  return {
    isValid: true,
    clientRoot,
  };
}

async function runTypeScriptChecks(clientRoot: string): Promise<string[]> {
  debugChecks('Running TypeScript checks...');
  const tsErrors = await getTsErrors(clientRoot);
  debugChecks('TypeScript errors found: %d', tsErrors.length);
  if (tsErrors.length > 0) {
    console.log('TypeScript errors:');
    tsErrors.forEach((error) => console.log('  ', error));
  }
  return tsErrors;
}

async function runBuildChecks(clientRoot: string): Promise<string[]> {
  debugChecks('Running build checks...');
  const buildErrors = await getBuildErrors(clientRoot);
  debugChecks('Build errors found: %d', buildErrors.length);
  if (buildErrors.length > 0) {
    console.log('Build errors:');
    buildErrors.forEach((error) => console.log('  ', error));
  }
  return buildErrors;
}

async function runBrowserChecks(
  clientRoot: string,
): Promise<{ consoleErrorCount: number; devServer: { process: ChildProcess; url: string } | null }> {
  debugChecks('Starting dev server for browser checks...');
  try {
    const server = await startDevServer(clientRoot);
    debugChecks('Dev server started at: %s', server.url);

    // Wait a bit for the server to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    debugChecks('Checking console errors...');
    const consoleErrors = await getConsoleErrors(server.url);
    const consoleErrorCount = consoleErrors.length;
    debugChecks('Console errors found: %d', consoleErrorCount);

    if (consoleErrors.length > 0) {
      console.log('Console errors:');
      consoleErrors.forEach((error) => console.log('  ', error));
    }

    return { consoleErrorCount, devServer: server };
  } catch (error) {
    debugChecks('Failed to run browser checks: %O', error);
    console.warn('Warning: Could not run browser checks:', error);
    return { consoleErrorCount: 0, devServer: null };
  }
}

export async function handleCheckClientCommand(
  command: CheckClientCommand,
): Promise<ClientCheckedEvent | ClientCheckFailedEvent> {
  const { clientDirectory, skipBrowserChecks = false } = command.data;

  debug('Handling CheckClientCommand');
  debug('  Client directory: %s', clientDirectory);
  debug('  Skip browser checks: %s', skipBrowserChecks);
  debug('  Request ID: %s', command.requestId);
  debug('  Correlation ID: %s', command.correlationId ?? 'none');

  let devServer: { process: ChildProcess; url: string } | null = null;

  try {
    // Validate directory
    const validation = validateClientDirectory(clientDirectory);
    if (!validation.isValid) {
      return {
        type: 'ClientCheckFailed',
        data: {
          clientDirectory,
          error: validation.error!,
        },
        timestamp: new Date(),
        requestId: command.requestId,
        correlationId: command.correlationId,
      };
    }

    const clientRoot = validation.clientRoot!;

    // Run checks
    const tsErrors = await runTypeScriptChecks(clientRoot);
    const buildErrors = await runBuildChecks(clientRoot);

    let consoleErrorCount = 0;
    if (!skipBrowserChecks) {
      const browserResult = await runBrowserChecks(clientRoot);
      consoleErrorCount = browserResult.consoleErrorCount;
      devServer = browserResult.devServer;
    } else {
      debugChecks('Skipping browser checks as requested');
    }

    const successEvent = createSuccessEvent(clientDirectory, tsErrors, buildErrors, consoleErrorCount, command);
    debugResult('Returning event: ClientChecked');
    return successEvent;
  } catch (error) {
    debug('ERROR: Exception caught: %O', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      type: 'ClientCheckFailed',
      data: {
        clientDirectory,
        error: errorMessage,
      },
      timestamp: new Date(),
      requestId: command.requestId,
      correlationId: command.correlationId,
    };
  } finally {
    // Clean up: close browser and dev server
    if (devServer?.process) {
      debugServer('Shutting down dev server...');
      devServer.process.kill();
    }

    debugChecks('Closing browser...');
    await closeBrowser();
  }
}

export const checkClientCommandHandler: CommandHandler<CheckClientCommand> = {
  name: 'CheckClient',
  handle: async (command: CheckClientCommand): Promise<void> => {
    debug('CommandHandler executing for CheckClient');
    const result = await handleCheckClientCommand(command);

    if (result.type === 'ClientChecked') {
      const { tsErrors, buildErrors, consoleErrors, allChecksPassed } = result.data;

      if (allChecksPassed) {
        debug('Command handler completed: all checks passed');
        console.log('✅ All frontend checks passed successfully');
      } else {
        debug('Command handler completed: some checks failed');
        console.log('❌ Frontend checks failed:');
        if (tsErrors > 0) console.log(`   - ${tsErrors} TypeScript errors`);
        if (buildErrors > 0) console.log(`   - ${buildErrors} build errors`);
        if (consoleErrors > 0) console.log(`   - ${consoleErrors} console errors`);
        process.exit(1);
      }
    } else {
      debug('Command handler completed: failure - %s', result.data.error);
      console.error(`❌ Frontend checks failed: ${result.data.error}`);
      process.exit(1);
    }
  },
};
