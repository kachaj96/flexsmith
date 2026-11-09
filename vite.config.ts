import { defineConfig } from 'vitest/config';

const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  base: './',
  define: { __BUILD_DATE__: JSON.stringify(buildDate) },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
