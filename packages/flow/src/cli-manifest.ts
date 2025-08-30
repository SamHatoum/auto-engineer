import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { exportSchemaManifest } from './commands/export-schema';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/flow',
  commands: {
    'export:schema': exportSchemaManifest,
  },
};
