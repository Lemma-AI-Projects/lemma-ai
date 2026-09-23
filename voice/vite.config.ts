/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { port: 5174, host: true },
  build: { outDir: 'dist', target: 'es2022' },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    globals: false,
  },
});
