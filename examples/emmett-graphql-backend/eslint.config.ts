import rootConfig from '../../eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(...rootConfig, {
  ignores: ['eslint.config.ts'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
  },
});
