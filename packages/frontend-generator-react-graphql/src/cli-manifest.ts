import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { commandHandler as generateClientHandler } from './commands/generate-client';
import { commandHandler as copyExampleHandler } from './commands/copy-example';

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
export const COMMANDS = [generateClientHandler, copyExampleHandler];

// Keep old format temporarily
export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/frontend-generator-react-graphql',
  version: getVersion(),
  commands: {
    [generateClientHandler.alias]: {
      handler: () => Promise.resolve({ default: generateClientHandler }),
      description: generateClientHandler.description,
      usage: `${generateClientHandler.alias} <args>`,
      examples: generateClientHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
    [copyExampleHandler.alias]: {
      handler: () => Promise.resolve({ default: copyExampleHandler }),
      description: copyExampleHandler.description,
      usage: `${copyExampleHandler.alias} <args>`,
      examples: copyExampleHandler.examples,
      args: [{ name: 'directory', description: 'Directory path', required: true }],
    },
  },
};
