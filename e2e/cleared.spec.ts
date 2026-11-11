import { button, deleteDatabase, expect, exportBackup, logOneSession, pickBackup, restoreOnWelcome, test } from './support/app';

test.slow();

test('data cleared by the browser: the marker shows the cleared screen and restore works', async ({ page }, testInfo) => {
  await logOneSession(page);
  const file = await exportBackup(page, testInfo);

  await deleteDatabase(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your data appears to have been cleared' })).toBeVisible();
  const dialog = await pickBackup(page, 'Restore from backup', file);
  await dialog.getByRole('button', { name: 'Replace all data' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('1 machine · 1 set')).toBeVisible();
});

test('data and marker both cleared: "Used this app before?" restores', async ({ page }, testInfo) => {
  await logOneSession(page);
  const file = await exportBackup(page, testInfo);

  await deleteDatabase(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await restoreOnWelcome(page, file);
  await expect(page.getByText('1 machine · 1 set')).toBeVisible();
  await expect(button(page, /Today's session/)).toBeVisible();
});
