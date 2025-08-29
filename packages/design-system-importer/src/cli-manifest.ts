import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { importDesignSystemManifest } from './commands/import-design-system';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/design-system-importer',
  commands: {
    'import:design-system': importDesignSystemManifest,
  },
};
