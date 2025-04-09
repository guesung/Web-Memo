import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  webServer: {
    command: 'pnpm run dev:web',
    url: 'http://localhost:3000',
  },
  use: {
    trace: 'on-first-retry',
    screenshot: process.env.CI ? undefined : 'only-on-failure',
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 5 * 60 * 1000,
});
