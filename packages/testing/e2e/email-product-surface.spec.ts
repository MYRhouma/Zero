import { expect, test } from '@playwright/test';

const hasSession = Boolean(
  process.env.PLAYWRIGHT_SESSION_TOKEN && process.env.PLAYWRIGHT_SESSION_DATA,
);

test.describe('email product surface', () => {
  test.skip(!hasSession, 'requires the existing testing-user session environment');

  test('does not expose the retired standalone landing pages', async ({ page }) => {
    for (const pathname of ['/about', '/pricing', '/developer']) {
      const response = await page.goto(pathname);
      expect(response?.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('keeps the mounted email workspace available', async ({ page }) => {
    await page.goto('/mail/inbox');
    await expect(page.getByText('Inbox')).toBeVisible();
  });
});
