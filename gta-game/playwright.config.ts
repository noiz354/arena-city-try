import { defineConfig } from '@playwright/test'

/**
 * Visual smoke test config. Runs against the production preview build.
 * Browsers are installed in CI (`npx playwright install --with-deps chromium`).
 */
export default defineConfig({
  testDir: './tests',
  testMatch: 'visual.spec.ts',
  timeout: 90_000,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
})
