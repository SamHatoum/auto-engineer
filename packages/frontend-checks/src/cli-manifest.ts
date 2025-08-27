import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/frontend-checks',
  commands: {
    'check:client': {
      handler: () => import('./commands/check-client'),
      description: 'Full frontend validation suite',
      usage: 'check:client <client-dir>',
      examples: ['$ auto check:client ./client'],
      args: [{ name: 'client-dir', description: 'Client directory to check', required: true }],
    },
  },
};
