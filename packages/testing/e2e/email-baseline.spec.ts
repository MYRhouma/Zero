import { expect, test } from '@playwright/test';

const hasSession = Boolean(
  process.env.PLAYWRIGHT_SESSION_TOKEN && process.env.PLAYWRIGHT_SESSION_DATA,
);

test.describe('email visual baseline', () => {
  test.skip(!hasSession, 'requires the existing testing-user session environment');

  test('captures the authenticated inbox at desktop and mobile sizes', async ({ page }) => {
    await page.goto('/mail/inbox');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Inbox')).toBeVisible();

    await page.screenshot({ path: 'artifacts/email-baseline-inbox-desktop.png', fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Inbox')).toBeVisible();
    await page.screenshot({ path: 'artifacts/email-baseline-inbox-mobile.png', fullPage: true });
  });
});
