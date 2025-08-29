import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { generateIAManifest } from './commands/generate-ia';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/information-architect',
  commands: {
    'generate:ia': generateIAManifest,
  },
};
