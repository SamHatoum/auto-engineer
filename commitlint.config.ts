import type { UserConfig } from '@commitlint/types';
import { readdirSync } from 'fs';
import { join } from 'path';

const getPackages = (dir: string) => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch {
    return [];
  }
};

const packages = getPackages(join(process.cwd(), 'packages'));
const apps = getPackages(join(process.cwd(), 'apps'));
const examples = getPackages(join(process.cwd(), 'examples'));
const integrations = getPackages(join(process.cwd(), 'integrations'));

const scopes = [
  'global',
  ...packages.map((pkg) => `packages/${pkg}`),
  ...apps.map((app) => `apps/${app}`),
  ...examples.map((example) => `examples/${example}`),
  ...integrations.map((integration) => `integrations/${integration}`)
];

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'scope-enum': [2, 'always', scopes],
    'scope-empty': [2, 'never'],
  },
};

export default config;
