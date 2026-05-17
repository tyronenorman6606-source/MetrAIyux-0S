import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: process.env.DASHBOARD_URL || 'http://127.0.0.1:7413',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
