import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  testMatch: '**/*.test.ts',

  /* CI-aware settings */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /* Reporter: list for console + JSON artifact in CI */
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list']],

  /* Global timeout per test */
  timeout: 30_000,

  use: {
    /* Backend running in docker-compose on port 3000 */
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000',

    /* Default headers — JWT token injected per-test via fixtures */
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },

    /* Trace on first retry for debugging CI failures */
    trace: 'on-first-retry',
  },

  /* No webServer block — backend is managed by docker-compose externally */
});
