import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/design-system-importer',
  commands: {
    'import:design-system': {
      handler: () => import('./commands/import-design-system'),
      description: 'Import Figma design system',
      usage: 'import:design-system <src> <mode> [filter]',
      examples: ['$ auto import:design-system ./.context WITH_COMPONENT_SETS ./shadcn-filter.ts'],
      args: [
        { name: 'src', description: 'Source directory for design system', required: true },
        { name: 'mode', description: 'Import mode (e.g., WITH_COMPONENT_SETS)', required: true },
        { name: 'filter', description: 'Optional filter file', required: false },
      ],
    },
  },
};
