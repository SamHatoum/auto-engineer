#!/usr/bin/env node
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { checkClientCommandHandler } from '../commands/check-client';
import createDebug from 'debug';

const debug = createDebug('frontend-checks:cli:check');

const __filename = fileURLToPath(import.meta.url);

const isMain = process.argv[1] === __filename;

if (isMain) {
  debug('CLI started with args: %o', process.argv.slice(2));

  const clientDirectory = process.argv[2];
  if (!clientDirectory) {
    debug('ERROR: No client directory provided');
    console.error('Usage: check:client <client-directory> [--skip-browser]');
    process.exit(1);
  }

  const skipBrowserChecks = process.argv.includes('--skip-browser');

  debug('Client directory argument: %s', clientDirectory);
  debug('Skip browser checks: %s', skipBrowserChecks);

  // Create command and execute handler
  const command = {
    type: 'CheckClient' as const,
    data: {
      clientDirectory,
      skipBrowserChecks,
    },
    timestamp: new Date(),
    requestId: `cli-${Date.now()}`,
  };

  debug('Executing command handler');
  void checkClientCommandHandler
    .handle(command)
    .then(() => {
      debug('Command completed successfully');
    })
    .catch((error) => {
      debug('Command failed: %O', error);
      console.error('Failed to execute command:', error);
      process.exit(1);
    });
}
