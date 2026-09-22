import { expect, test } from '@playwright/test';

const hasSession = Boolean(
  process.env.PLAYWRIGHT_SESSION_TOKEN && process.env.PLAYWRIGHT_SESSION_DATA,
);

test.describe('canonical email session boundary', () => {
  test.skip(!hasSession, 'requires the existing testing-user session environment');

  test('loads the inbox through the canonical email app mount', async ({ page }) => {
    await page.goto('/mail/inbox');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Inbox')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('does not fall through to a public product landing page', async ({ page }) => {
    await page.goto('/mail/inbox');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).not.toHaveTitle(/Zero|Mail-0/i);
  });
});
