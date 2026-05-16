import { test, expect } from '@playwright/test';

test('dashboard overview loads and exposes operator truth', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CitadelDB Ultimate' })).toBeVisible();
  await expect(page.getByText('Operator truth')).toBeVisible();
});

test('actions page exposes safe job enqueue form', async ({ page }) => {
  await page.goto('/actions');
  await expect(page.getByRole('heading', { name: 'Enqueue safe operator job' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enqueue job' })).toBeVisible();
});

test('jobs page loads', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Operator jobs' })).toBeVisible();
});
