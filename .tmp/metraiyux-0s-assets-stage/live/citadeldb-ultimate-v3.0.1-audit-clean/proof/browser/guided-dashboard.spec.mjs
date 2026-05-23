import { test, expect } from '@playwright/test';

const base = process.env.DASHBOARD_URL || 'http://127.0.0.1:7413';

test('dashboard guided operator pages render', async ({ page }) => {
  const pages = [
    ['/setup-wizard', 'Setup Wizard'],
    ['/onboarding', 'First Run'],
    ['/guided', 'Guided Ops'],
    ['/launchpad', 'Database Launchpad'],
    ['/ai-debug', 'AI Debug Assistant'],
    ['/app-onboarding', 'App Onboarding'],
    ['/app-lifecycle', 'App Lifecycle'],
    ['/self-service', 'Self-Service Console'],
    ['/platform', 'Platform'],
    ['/table-browser', 'Table Browser'],
    ['/commercial', 'Commercial Control Plane'],
    ['/live-gates', 'Live Gates'],
    ['/live-gates/protected-routes', 'Protected Route Registry'],
    ['/branches', 'Database Branches']
  ];

  for (const [path, text] of pages) {
    await page.goto(`${base}${path}`);
    await expect(page.getByText(text).first()).toBeVisible();
  }
});

test('database launchpad exposes connection test form', async ({ page }) => {
  await page.goto(`${base}/launchpad`);
  await expect(page.getByText('Test a DATABASE_URL')).toBeVisible();
  await expect(page.locator('textarea[name="databaseUrl"]').first()).toBeVisible();
});
