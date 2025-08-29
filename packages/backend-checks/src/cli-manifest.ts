import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { checkTypesManifest } from './commands/check-types';
import { checkLintManifest } from './commands/check-lint';
import { checkTestsManifest } from './commands/check-tests';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/backend-checks',
  commands: {
    'check:types': checkTypesManifest,
    'check:lint': checkLintManifest,
    'check:tests': checkTestsManifest,
  },
};
