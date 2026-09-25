import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',   // each test builds its own jsdom via test/harness.js
    include: ['test/**/*.test.js'],
    restoreMocks: true,
    // The app runs as one bundle (test/harness.js); .cache/app.js is that
    // bundle, and its source map carries the coverage back to js/.
    coverage: {
      provider: 'v8',
      include: ['js/**', '.cache/**'],
      exclude: ['test/**'],   // the defaults skip dot-directories, and so .cache/
      reporter: ['text', 'text-summary']
    }
  }
});
