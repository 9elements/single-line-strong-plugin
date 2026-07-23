import { defineConfig } from 'vitest/config';

// The segment bridge only touches root/paragraph/text nodes and the built-in
// `bold` format flag — no DOM — so tests run in a plain Node environment
// (no jsdom). `@lexical/headless` drives a real editor without a browser.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
