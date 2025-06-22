import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.specs.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/**',
        '**/*.d.ts',
        '**/*.js'
      ],
      // all: true
      // thresholds: {
      //   lines: 90,
      //   functions: 90,
      //   branches: 90,
      //   statements: 90
      // }
    }
  }
}) 