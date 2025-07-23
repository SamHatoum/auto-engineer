import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { runFlows } from '../agent/runFlows';

const __filename = fileURLToPath(import.meta.url);

const isMain = process.argv[1] === __filename;

if (isMain) {
  const base = process.argv[2];
  if (!base) {
    console.error('Usage: tsx src/cli/index.ts path/to/server/root');
    process.exit(1);
  }

  const serverRoot = path.resolve(base);
  const flowsDir = path.join(serverRoot, 'src', 'domain', 'flows');

  if (!existsSync(flowsDir)) {
    console.error(`❌ Flows directory not found at: ${flowsDir}`);
    process.exit(1);
  }

  void runFlows(flowsDir);
}
