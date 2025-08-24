import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { runFlows } from '../agent/runFlows';
import createDebug from 'debug';

const debug = createDebug('server-impl:cli');

const __filename = fileURLToPath(import.meta.url);

const isMain = process.argv[1] === __filename;

if (isMain) {
  debug('CLI started with args: %o', process.argv.slice(2));

  const base = process.argv[2];
  if (!base) {
    debug('ERROR: No server root path provided');
    console.error('Usage: tsx src/cli/index.ts path/to/server/root');
    process.exit(1);
  }

  debug('Server root argument: %s', base);

  const serverRoot = path.resolve(base);
  debug('Resolved server root: %s', serverRoot);

  const flowsDir = path.join(serverRoot, 'src', 'domain', 'flows');
  debug('Flows directory: %s', flowsDir);

  if (!existsSync(flowsDir)) {
    debug('ERROR: Flows directory does not exist at %s', flowsDir);
    console.error(`❌ Flows directory not found at: ${flowsDir}`);
    process.exit(1);
  }

  debug('Flows directory exists, starting flow runner');
  void runFlows(flowsDir)
    .then(() => {
      debug('Flow runner completed');
    })
    .catch((error) => {
      debug('ERROR: Flow runner failed: %O', error);
      console.error('Flow runner failed:', error);
      process.exit(1);
    });
}
