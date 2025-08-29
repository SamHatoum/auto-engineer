import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { generateServerManifest } from './commands/generate-server';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/emmett-generator',
  commands: {
    'generate:server': generateServerManifest,
  },
};
