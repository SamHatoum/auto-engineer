import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { commandHandler as implementClientHandler } from './commands/implement-client';

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
export const COMMANDS = [implementClientHandler];

// Keep old format temporarily
export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/frontend-implementer',
  version: getVersion(),
  commands: {
    [implementClientHandler.alias]: {
      handler: () => Promise.resolve({ default: implementClientHandler }),
      description: implementClientHandler.description,
      usage: `${implementClientHandler.alias} <args>`,
      examples: implementClientHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
  },
};
