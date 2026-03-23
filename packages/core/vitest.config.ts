import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@blind-alliance/core': path.resolve(__dirname, 'src/index.ts'),
      '@blind-alliance/core-engine': path.resolve(__dirname, '../core-engine/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
