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
 *
 * esbuild target: jsx set to "react-jsx" so JSX in source files is
 * transformed by esbuild's automatic runtime (react/jsx-runtime) rather
 * than requiring an explicit `import React from 'react'` in every file.
 * This matches Next.js's jsxImportSource behaviour at test time.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
  },
});
