import rootConfig from '../../eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(...rootConfig, {
  ignores: ['eslint.config.ts'],
  languageOptions: {
    parserOptions: {
      project: ['./tsconfig.json', './tsconfig.test.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
