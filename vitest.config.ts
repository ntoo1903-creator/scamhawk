import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'app', 'components', 'i18n', 'messages', 'prisma'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
