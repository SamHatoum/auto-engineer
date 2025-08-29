import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { implementServerManifest } from './commands/implement-server';
import { implementSliceManifest } from './commands/implement-slice';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/server-implementer',
  commands: {
    'implement:server': implementServerManifest,
    'implement:slice': implementSliceManifest,
  },
};
