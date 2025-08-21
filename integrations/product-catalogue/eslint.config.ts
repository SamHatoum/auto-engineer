import rootConfig from '../../eslint.config.ts';
import tseslint from 'typescript-eslint';

export default tseslint.config(...rootConfig, {
  ignores: ['eslint.config.ts', 'src/generated/**/*'],
  languageOptions: {
    parserOptions: {
      project: ['./tsconfig.json', './tsconfig.test.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
