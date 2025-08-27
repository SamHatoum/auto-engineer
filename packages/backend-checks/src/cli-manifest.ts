import type { CliManifest } from '@auto-engineer/cli/manifest-types';

export const CLI_MANIFEST: CliManifest = {
  category: '@auto-engineer/backend-checks',
  commands: {
    'check:types': {
      handler: () => import('./commands/check-types'),
      description: 'TypeScript type checking',
      usage: 'check:types <directory>',
      examples: ['$ auto check:types ./server', '$ auto check:types ./server --scope project'],
      args: [{ name: 'directory', description: 'Directory to check', required: true }],
      options: [{ name: '--scope <scope>', description: 'Check scope: slice (default) or project' }],
    },
    'check:lint': {
      handler: () => import('./commands/check-lint'),
      description: 'ESLint with optional auto-fix',
      usage: 'check:lint <directory> [--fix]',
      examples: ['$ auto check:lint ./server', '$ auto check:lint ./server --fix'],
      args: [{ name: 'directory', description: 'Directory to lint', required: true }],
      options: [
        { name: '--fix', description: 'Automatically fix linting issues' },
        { name: '--scope <scope>', description: 'Lint scope: slice (default) or project' },
      ],
    },
    'check:tests': {
      handler: () => import('./commands/check-tests'),
      description: 'Run Vitest test suites',
      usage: 'check:tests <directory>',
      examples: ['$ auto check:tests ./server', '$ auto check:tests ./server --scope project'],
      args: [{ name: 'directory', description: 'Directory containing tests', required: true }],
      options: [{ name: '--scope <scope>', description: 'Test scope: slice (default) or project' }],
    },
  },
};
