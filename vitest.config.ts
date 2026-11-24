import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unitarios', include: ['tests/unit/**/*.test.ts', 'packages/adapters/in-http/test/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'integracion', include: ['tests/integracion/**/*.test.ts'], environment: 'node', fileParallelism: false, testTimeout: 15000, hookTimeout: 15000 } },
    ],
  },
});
