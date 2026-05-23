const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

test('vault shell opens and ten game doors render', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=Ten games. One empire. No permission required.')).toBeVisible();
  await expect(page.locator('.game-card')).toHaveCount(10);
  await expect(page.locator('#campaignPanel')).toContainText('Vault Map');
  await expect(page.locator('#shopPanel')).toContainText('Vault Shop');
  await expect(page.locator('#saveSlotsPanel')).toContainText('Local Save Slots');
  await expect(page.locator('#analyticsPanel')).toContainText('Vault Analytics');
  await expect(page.locator('#commandCenterPanel')).toContainText('Vault Command Center');
  await expect(page.locator('#weeklyPanel')).toContainText('Weekly Conquest');
  await expect(page.locator('#prestigePanel')).toContainText('Crown Prestige');
  await expect(page.locator('#milestonePanel')).toContainText('Milestone Matrix');
  expect(errors).toEqual([]);
});

test('can open and close each vault game without fatal console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  const count = await page.locator('.game-card').count();
  expect(count).toBe(10);
  for (let i = 0; i < count; i++) {
    await page.locator('.game-card').nth(i).click();
    await expect(page.locator('#gameOverlay')).toHaveClass(/active/);
    await expect(page.locator('#gameHost')).toBeVisible();
    await page.locator('#closeGameBtn').click();
    await expect(page.locator('#gameOverlay')).not.toHaveClass(/active/);
  }
  expect(errors).toEqual([]);
});
