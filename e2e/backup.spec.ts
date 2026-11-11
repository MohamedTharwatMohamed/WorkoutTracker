import { devices } from '@playwright/test';
import {
  button,
  editJson,
  expect,
  exportBackup,
  logOneSession,
  pickBackup,
  restoreOnWelcome,
  test,
} from './support/app';

// Each test logs a session, exports and restores, sometimes in a second browser context.
test.slow();

test('a backup from one device restores on a PC browser', async ({ page, browser }, testInfo) => {
  await logOneSession(page);
  const file = await exportBackup(page, testInfo);

  const pc = await browser.newContext({ ...devices['Desktop Chrome'], baseURL: testInfo.project.use.baseURL });
  const pcPage = await pc.newPage();
  await pcPage.goto('/');
  const chooser = pcPage.waitForEvent('filechooser');
  await button(pcPage, 'Yes, restore a backup').click();
  await (await chooser).setFiles(file);
  const dialog = pcPage.getByRole('dialog', { name: 'Restore this backup?' });
  await expect(dialog).toContainText(/Sessions\s*1/);
  await expect(dialog).toContainText(/Sets\s*1/);
  await dialog.getByRole('button', { name: 'Replace all data' }).click();
  await expect(pcPage.getByText('1 machine · 1 set')).toBeVisible();
  await pc.close();
});

test('an edited backup is rejected', async ({ page }, testInfo) => {
  await logOneSession(page);
  const file = await exportBackup(page, testInfo);
  const edited = await editJson(
    file,
    (json) => {
      const data = json.data as { sets: { reps: number }[] };
      data.sets[0]!.reps += 1;
    },
    testInfo.outputPath('edited.json'),
  );
  await pickBackup(page, 'Restore from backup', edited);
  await expect(page.getByRole('alert')).toContainText('Checksum mismatch');
});

test('restoring over unsaved changes exports the current data first', async ({ page }, testInfo) => {
  await logOneSession(page);
  const file = await exportBackup(page, testInfo);

  await page.goto('/body');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('80');
  await button(page, 'Save measurements').click();
  await expect(page.getByText('Saved 1 value.')).toBeVisible();

  await page.goto('/settings');
  const dialog = await pickBackup(page, 'Restore from backup', file);
  await expect(dialog).toContainText('not in a backup');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Replace all data' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await expect(page.getByText('Backup restored.')).toBeVisible();

  await page.goto('/body');
  await expect(page.getByText('No measurements yet.')).toBeVisible();
});

test('restore on the welcome screen', async ({ page, browser }, testInfo) => {
  await logOneSession(page);
  const file = await exportBackup(page, testInfo);
  const other = await browser.newContext({ ...testInfo.project.use, baseURL: testInfo.project.use.baseURL });
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  await restoreOnWelcome(otherPage, file);
  await other.close();
});
