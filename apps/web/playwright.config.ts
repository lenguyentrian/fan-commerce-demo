import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * E2E scope: the journeys that must never break — browse, add to cart, log in,
 * check out, see the order. Everything cheaper to test is covered by Jest
 * (components) or @fc/core (domain rules), so this suite stays small enough
 * to run on every pull request.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A test that only passes on a retry locally is a flaky test; fail the build.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Mobile viewport matters for a commerce flow: the checkout CTA and the
      // quantity stepper are the first things to break on a 390px screen.
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: {
    // Runs the production build, not `next dev`: dev-mode timing hides real
    // hydration and caching problems.
    command: `npm run start -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SESSION_SECRET: 'playwright-e2e-session-secret-at-least-32-chars',
      NODE_ENV: 'production',
      // Every test logs in, and they all share one IP, so the shipped
      // 8-per-minute login limit would reject most of the suite. The limit
      // itself is covered by a dedicated test that sets its own ceiling.
      RATE_LIMIT_LOGIN_MAX: '1000',
      RATE_LIMIT_CHECKOUT_MAX: '1000',
    },
  },
});
