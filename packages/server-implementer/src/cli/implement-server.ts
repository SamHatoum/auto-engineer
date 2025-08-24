#!/usr/bin/env node
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { implementServerCommandHandler } from '../commands/implement-server';
import createDebug from 'debug';

const debug = createDebug('server-impl:cli:implement');

const __filename = fileURLToPath(import.meta.url);

const isMain = process.argv[1] === __filename;

if (isMain) {
  debug('CLI started with args: %o', process.argv.slice(2));

  const serverDirectory = process.argv[2];
  if (!serverDirectory) {
    debug('ERROR: No server directory provided');
    console.error('Usage: implement:server <server-directory>');
    process.exit(1);
  }

  debug('Server directory argument: %s', serverDirectory);

  // Create command and execute handler
  const command = {
    type: 'ImplementServer' as const,
    data: {
      serverDirectory,
    },
    timestamp: new Date(),
    requestId: `cli-${Date.now()}`,
  };

  debug('Executing command handler');
  void implementServerCommandHandler
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
