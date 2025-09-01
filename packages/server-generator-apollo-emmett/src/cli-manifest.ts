import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { commandHandler as generateServerHandler } from './commands/generate-server';

// Get version from package.json
const getVersion = (): string => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // In dev: src/cli-manifest.ts -> ../../package.json
    // In dist: dist/cli-manifest.js -> ../package.json
    const possiblePaths = [
      path.join(__dirname, '..', 'package.json'), // dist build
      path.join(__dirname, '..', '..', 'package.json'), // dev/src
    ];

    for (const packageJsonPath of possiblePaths) {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };
        return packageJson.version;
      }
    }
  } catch {
    // Fall through
  }
  return 'unknown';
};

// Export new unified format
export const COMMANDS = [generateServerHandler];

// Keep old format temporarily
export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/server-generator-apollo-emmett',
  version: getVersion(),
  commands: {
    [generateServerHandler.alias]: {
      handler: () => Promise.resolve({ default: generateServerHandler }),
      description: generateServerHandler.description,
      usage: `${generateServerHandler.alias} <args>`,
      examples: generateServerHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
  },
};
