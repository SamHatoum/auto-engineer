import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/information-architect',
  commands: {
    'generate:ia': {
      handler: () => import('./commands/generate-ia'),
      description: 'Generate Information Architecture',
      usage: 'generate:ia <context> <flows...>',
      examples: ['$ auto generate:ia ./.context ./flows/*.flow.ts'],
      args: [
        { name: 'context', description: 'Context directory', required: true },
        { name: 'flows...', description: 'Flow files to analyze', required: true },
      ],
    },
  },
};
