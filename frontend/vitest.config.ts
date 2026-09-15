import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for the Sovereign-AMM frontend.
 *
 * Mirrors the @/ path alias defined in tsconfig.json so test files
 * (and the source modules they import) can resolve @/store, @/types, etc.
 *
 * Environment is set to "node" for server-side utility tests.
 * Tests that need browser globals (window, document) can override the
 * environment at the file level with `// @vitest-environment jsdom`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
  },
});
