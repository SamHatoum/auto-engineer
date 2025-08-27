import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/emmett-generator',
  commands: {
    'generate:server': {
      handler: () => import('./commands/generate-server'),
      description: 'Generate server from schema.json',
      usage: 'generate:server <schema> <dest>',
      examples: ['$ auto generate:server .context/schema.json .'],
      args: [
        { name: 'schema', description: 'Path to schema.json file', required: true },
        { name: 'dest', description: 'Destination directory for generated server', required: true },
      ],
    },
  },
};
