import { test, expect } from '@playwright/test';

test('Site carrega e tem título correto', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NOSZONA|Smart City/i);
});
