import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { commandHandler as checkTypesHandler } from './commands/check-types';
import { commandHandler as checkLintHandler } from './commands/check-lint';
import { commandHandler as checkTestsHandler } from './commands/check-tests';

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
export const COMMANDS = [checkTypesHandler, checkLintHandler, checkTestsHandler];

// Keep old format temporarily
export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/server-checks',
  version: getVersion(),
  commands: {
    [checkTypesHandler.alias]: {
      handler: () => Promise.resolve({ default: checkTypesHandler }),
      description: checkTypesHandler.description,
      usage: `${checkTypesHandler.alias} <args>`,
      examples: checkTypesHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
    [checkLintHandler.alias]: {
      handler: () => Promise.resolve({ default: checkLintHandler }),
      description: checkLintHandler.description,
      usage: `${checkLintHandler.alias} <args>`,
      examples: checkLintHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
    [checkTestsHandler.alias]: {
      handler: () => Promise.resolve({ default: checkTestsHandler }),
      description: checkTestsHandler.description,
      usage: `${checkTestsHandler.alias} <args>`,
      examples: checkTestsHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
  },
};
