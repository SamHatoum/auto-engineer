import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/flowlang',
  commands: {
    'create:example': {
      handler: () => import('./commands/create-example'),
      description: 'Create an example project with FlowLang',
      usage: 'create:example <name>',
      examples: ['$ auto create:example shopping-assistant'],
      args: [{ name: 'name', description: 'Project name (e.g., shopping-assistant)', required: true }],
    },
    'export:schema': {
      handler: () => import('./commands/export-schema'),
      description: 'Export flow schemas to context directory',
      usage: 'export:schema <context> <flows>',
      examples: ['$ auto export:schema ./.context ./flows'],
      args: [
        { name: 'context', description: 'Context directory path', required: true },
        { name: 'flows', description: 'Flows directory path', required: true },
      ],
    },
  },
};
