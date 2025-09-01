import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { commandHandler as exportSchemaHandler } from './commands/export-schema';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isNode(): boolean {
  return typeof process !== 'undefined' && typeof (process as NodeJS.Process | undefined)?.versions?.node === 'string';
}

const getVersion = (): string => {
  if (isBrowser() || !isNode()) {
    return 'unknown';
  }

  try {
    // Dynamic require to avoid breaking in browser
    const nodeRequire = (0, eval)('require') as (id: string) => unknown;
    const fs = nodeRequire('fs') as typeof import('fs');
    const path = nodeRequire('path') as typeof import('path');
    const { fileURLToPath } = nodeRequire('url') as typeof import('url');

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
    // Fall through - could be browser environment or missing deps
  }
  return 'unknown';
};

// Export new unified format
export const COMMANDS = [exportSchemaHandler];

// Keep old format temporarily
export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/flow',
  version: getVersion(),
  commands: {
    [exportSchemaHandler.alias]: {
      handler: () => Promise.resolve({ default: exportSchemaHandler }),
      description: exportSchemaHandler.description,
      usage: `${exportSchemaHandler.alias} <args>`,
      examples: exportSchemaHandler.examples,
      args: [{ name: 'directory', description: 'Context directory path', required: true }],
    },
  },
};
