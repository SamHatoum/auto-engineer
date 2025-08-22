import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.specs.{js,ts}'],
    exclude: ['**/.tmp/**', '**/node_modules/**', '**/dist/**'],
    passWithNoTests: true,
  },
});
