import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',   // each test builds its own jsdom via test/harness.js
    include: ['test/**/*.test.js'],
    restoreMocks: true
  }
});
