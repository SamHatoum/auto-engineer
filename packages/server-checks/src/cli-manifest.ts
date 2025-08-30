import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { checkTypesManifest } from './commands/check-types';
import { checkLintManifest } from './commands/check-lint';
import { checkTestsManifest } from './commands/check-tests';

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

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/server-checks',
  version: getVersion(),
  commands: {
    'check:types': checkTypesManifest,
    'check:lint': checkLintManifest,
    'check:tests': checkTestsManifest,
  },
};
