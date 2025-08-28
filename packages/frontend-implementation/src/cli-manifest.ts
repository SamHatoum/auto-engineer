import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/frontend-implementation',
  commands: {
    'implement:client': {
      handler: () => import('./commands/implement-client'),
      description: 'AI implements client',
      usage: 'implement:client <client> <context> <principles> <design>',
      examples: ['$ auto implement:client ./client ./.context ./design-principles.md ./design-system.md'],
      args: [
        { name: 'client', description: 'Client directory path', required: true },
        { name: 'context', description: 'Context directory path', required: true },
        { name: 'principles', description: 'Design principles file', required: true },
        { name: 'design', description: 'Design system file', required: true },
      ],
    },
  },
};
