import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.specs.ts'],
    exclude: ['templates/**', 'node_modules/**', 'dist/**'],
  },
});
