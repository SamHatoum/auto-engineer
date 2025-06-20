import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
    const tsconfigPaths = (await import('vite-tsconfig-paths')).default;

    return {
        plugins: [tsconfigPaths()],
        test: {
            globals: true,
            environment: 'node',
            include: ['src/**/*.spec.ts'],
            setupFiles: [],
        },
    };
});