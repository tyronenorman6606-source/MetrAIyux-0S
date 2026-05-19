import { test, expect } from "@playwright/test";

test.describe("SkyeAPI console contract", () => {
  test("renders paid-platform operator controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#connection-form")).toBeVisible();
    await expect(page.locator("#import-env")).toBeVisible();
    await expect(page.locator("#claim-job-lease")).toBeVisible();
    await expect(page.locator("#sign-provider-pack")).toBeVisible();
    await expect(page.locator("#install-pack-source")).toBeVisible();
    await expect(page.locator("#load-billing-invoice")).toBeVisible();
  });
});
