import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { checkClientManifest } from './commands/check-client';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/frontend-checks',
  commands: {
    'check:client': checkClientManifest,
  },
};
