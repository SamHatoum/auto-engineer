import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { implementClientManifest } from './commands/implement-client';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/frontend-implementation',
  commands: {
    'implement:client': implementClientManifest,
  },
};
