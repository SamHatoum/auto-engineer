import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { commandHandler as implementServerHandler } from './commands/implement-server';
import { commandHandler as implementSliceHandler } from './commands/implement-slice';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
export const COMMANDS = [implementServerHandler, implementSliceHandler];

// Keep old format temporarily
export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/server-implementer',
  version: getVersion(),
  commands: {
    [implementServerHandler.alias]: {
      handler: () => Promise.resolve({ default: implementServerHandler }),
      description: implementServerHandler.description,
      usage: `${implementServerHandler.alias} <args>`,
      examples: implementServerHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
    [implementSliceHandler.alias]: {
      handler: () => Promise.resolve({ default: implementSliceHandler }),
      description: implementSliceHandler.description,
      usage: `${implementSliceHandler.alias} <args>`,
      examples: implementSliceHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
  },
};
