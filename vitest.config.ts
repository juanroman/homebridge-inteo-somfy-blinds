import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'], // Entry point is just re-exports
      thresholds: {
        // Target 80% coverage on business logic
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Timeout for async operations (scene execution can take time)
    testTimeout: 10000,
  },
});
