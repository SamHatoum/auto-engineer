import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/flowlang',
  commands: {
    'create:example': {
      handler: () => import('./commands/create-example'),
      description: 'Create an example project with FlowLang',
      usage: 'create:example <name> [directory]',
      examples: ['$ auto create:example shopping-assistant', '$ auto create:example shopping-assistant shop'],
      args: [
        { name: 'name', description: 'Project name (e.g., shopping-assistant)', required: true },
        {
          name: 'directory',
          description: 'Directory to create the example in (defaults to example name)',
          required: false,
        },
      ],
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
