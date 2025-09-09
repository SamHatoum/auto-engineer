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

const specialScopes = ['global', 'root'];
const packages = getPackages(join(process.cwd(), 'packages'));
const examples = getPackages(join(process.cwd(), 'examples'));

const scopes = [
  ...specialScopes,
  ...packages.map((pkg) => `packages/${pkg}`),
  ...packages.map((pkg) => `${pkg}`),
  ...examples.map((example) => `examples/${example}`),
  ...examples.map((example) => `${example}`),
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
