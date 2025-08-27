import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/react-graphql-generator',
  commands: {
    'generate:client': {
      handler: () => import('./commands/generate-client'),
      description: 'Generate React client app',
      usage: 'generate:client <starter> <client> <ia> <gql> [vars]',
      examples: ['$ auto generate:client ./shadcn-starter ./client ./auto-ia.json ./schema.graphql ./figma-vars.json'],
      args: [
        { name: 'starter', description: 'Starter template path', required: true },
        { name: 'client', description: 'Client output directory', required: true },
        { name: 'ia', description: 'Information architecture JSON file', required: true },
        { name: 'gql', description: 'GraphQL schema file', required: true },
        { name: 'vars', description: 'Figma variables JSON file', required: false },
      ],
    },
    'copy:example': {
      handler: () => import('./commands/copy-example'),
      description: 'Copy example React GraphQL template',
      usage: 'copy:example <example-name> <destination>',
      examples: ['$ auto copy:example shadcn-starter ./my-starter'],
      args: [
        { name: 'example-name', description: 'Name of the example template', required: true },
        { name: 'destination', description: 'Destination directory', required: true },
      ],
    },
  },
};
