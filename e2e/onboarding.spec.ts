import { asInstalled, button, expect, onboard, test } from './support/app';

test('first run in a browser tab shows the install guide, then onboarding', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Mobile Chrome', 'CUJ 1 is a phone journey');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Install the app' })).toBeVisible();
  await expect(page.getByText('open the browser menu and choose "Install app"')).toBeVisible();
  await button(page, 'Continue in browser').click();
  await expect(page.getByRole('heading', { name: 'Used this app before?' })).toBeVisible();
  await button(page, 'No, start fresh').click();
  await button(page, 'kg').click();
  await button(page, 'cm').click();
  await page.getByLabel('Height (optional) (cm)').fill('180');
  await button(page, 'Get started').click();
  await expect(button(page, /Today's session/)).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText('Storage protected').locator('..')).toHaveText(/Storage protected(Yes|No)/);
});

test('installed app skips the install guide and the tab warning', async ({ page, context }) => {
  await asInstalled(context);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Used this app before?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install the app' })).toHaveCount(0);
  await onboard(page);
  await expect(page.getByText('You are using the browser tab')).toHaveCount(0);
});
