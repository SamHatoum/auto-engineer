import type { CliManifest } from '@auto-engineer/cli/manifest-types';
import { generateClientManifest } from './commands/generate-client';
import { copyExampleManifest } from './commands/copy-example';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/react-graphql-generator',
  commands: {
    'generate:client': generateClientManifest,
    'copy:example': copyExampleManifest,
  },
};
