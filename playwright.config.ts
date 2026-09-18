import { defineConfig, devices } from '@playwright/test'


export default defineConfig({
  testDir:       'tests/e2e',
  fullyParallel: true,
  reporter:      'list',
  use:           {
    baseURL:  'http://localhost:4173',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }},
  ],
  webServer: {
    command:             'bun run serve:web',
    url:                 'http://localhost:4173/index.html',
    reuseExistingServer: true,
  },
})
