import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4367';

test('local brain routes buyer auth proof question seriously', async ({ page }) => {
  await page.goto(`${base}/local-brain.html`);
  await expect(page.locator('#brainStatus')).toContainText('16 operating brains', { timeout: 10000 });
  await page.locator('#brainQuestion').fill('A Phoenix buyer asks how this is more than a website and wants auth/proof. Which brain handles it and what link do I send?');
  await page.locator('#askBrain').click();
  const answer = page.locator('#brainAnswer');
  await expect(answer).toContainText('Serious route');
  await expect(answer).toContainText('Celeste');
  await expect(answer).toContainText('0meg4kAI');
  await expect(answer).toContainText('Direct answer');
  await expect(answer).toContainText('Live surfaces');
  await expect(answer).not.toContainText('No strong match found');
});

test('local brain reports 16 brains', async ({ page }) => {
  await page.goto(`${base}/local-brain.html`);
  await expect(page.locator('#brainStatus')).toContainText('16 operating brains', { timeout: 10000 });
  await page.locator('#brainQuestion').fill('How many local brains are wired up in this runtime?');
  await page.locator('#askBrain').click();
  await expect(page.locator('#brainAnswer')).toContainText('There are 16 operating brains');
});

test('person brains answer from an owner lane instead of snippet spam', async ({ page }) => {
  await page.goto(`${base}/person-brains.html`);
  await expect(page.locator('#personaStatus')).toContainText('16 operating brains', { timeout: 10000 });
  await page.locator('#brainSelector').selectOption('celeste-monroe-brain');
  await page.locator('#personaQuestion').fill('A buyer asks how this is more than a website. What should I say and what proof link should I send?');
  await page.locator('#askPersonaBrain').click();
  const answer = page.locator('#personaAnswer');
  await expect(answer).toContainText('serious answer');
  await expect(answer).toContainText('Direct answer');
  await expect(answer).toContainText('Operating surface');
  await expect(answer).not.toContainText('no strong match found');
});
