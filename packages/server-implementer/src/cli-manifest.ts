import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/server-implementer',
  commands: {
    'implement:server': {
      handler: () => import('./commands/implement-server'),
      description: 'AI implements server TODOs and tests',
      usage: 'implement:server <server-dir>',
      examples: ['$ auto implement:server ./server'],
      args: [{ name: 'server-dir', description: 'Server directory path', required: true }],
    },
    'implement:slice': {
      handler: () => import('./commands/implement-slice'),
      description: 'AI implements a specific server slice',
      usage: 'implement:slice <server-dir> <slice-name>',
      examples: ['$ auto implement:slice ./server enters-shopping-criteria'],
      args: [
        { name: 'server-dir', description: 'Server directory path', required: true },
        { name: 'slice-name', description: 'Name of the slice to implement', required: true },
      ],
    },
  },
};
