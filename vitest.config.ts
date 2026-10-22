// Runs with bun.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // Entry points only wire files, AWS and the network; their logic lives in tested modules.
      exclude: ['**/*.test.ts', 'src/cdk/app.ts', 'src/cli/**'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
    include: ['src/**/*.test.ts'],
  },
})
