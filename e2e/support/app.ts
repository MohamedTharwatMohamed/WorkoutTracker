import { readFile, writeFile } from 'node:fs/promises';
import { test as base, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';

/**
 * Every test runs with the Web Share API hidden, so backups always take the download
 * path that Playwright can capture (the real share sheet is checked manually).
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
    });
    await use(context);
  },
});
export { expect };

/** Playwright has no display-mode emulation, so "installed" is a matchMedia stub. */
export async function asInstalled(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      const list = original(query);
      if (!query.includes('display-mode: standalone')) return list;
      return Object.create(list, { matches: { value: true } }) as MediaQueryList;
    };
  });
}

export const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

/** Skips the install guide when it shows (touch devices in a browser tab). */
async function passInstallStep(page: Page): Promise<void> {
  const cont = button(page, 'Continue in browser');
  const usedBefore = page.getByRole('heading', { name: 'Used this app before?' });
  await expect(cont.or(usedBefore)).toBeVisible();
  if (await cont.isVisible()) await cont.click();
  await expect(usedBefore).toBeVisible();
}

/** Fresh start: through the welcome steps to Home. */
export async function onboard(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await passInstallStep(page);
  await button(page, 'No, start fresh').click();
  await button(page, 'Get started').click();
  await expect(button(page, /Today's session/)).toBeVisible();
}

/** Adds the first machine in the picker to the routine, with a target weight so sets are pre-filled. */
export async function addRoutineMachine(page: Page, base = ''): Promise<void> {
  await page.goto(`${base}/routine`);
  await button(page, '+ Add machine').click();
  await page.getByRole('dialog', { name: 'Add a machine' }).getByRole('listitem').first().getByRole('button').click();
  await button(page, 'Weight +').click();
  await expect(button(page, 'No target weight')).toBeVisible();
}

/** Opens today's session from Home and starts it. */
export async function startSession(page: Page, base = ''): Promise<void> {
  await page.goto(`${base}/`);
  await button(page, /Today's session/).click();
  await button(page, 'Start').click();
  await expect(button(page, 'Finish')).toBeVisible();
}

export async function finishSession(page: Page): Promise<void> {
  await button(page, 'Finish').click();
  await page.getByRole('dialog', { name: 'Finish this session?' }).getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
}

/** Onboards, then logs one finished session with one set. */
export async function logOneSession(page: Page): Promise<void> {
  await onboard(page);
  await addRoutineMachine(page);
  await startSession(page);
  await button(page, 'Save').click();
  await expect(page.getByText('Set saved')).toBeVisible();
  await finishSession(page);
}

/** Exports from Settings and returns the saved file path. */
export async function exportBackup(page: Page, testInfo: TestInfo, name = 'backup.json'): Promise<string> {
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('main').getByRole('button', { name: 'Back up', exact: true }).click();
  const path = testInfo.outputPath(name);
  await (await download).saveAs(path);
  return path;
}

/** Clicks a restore button, picks the file and returns the preview dialog. */
export async function pickBackup(page: Page, buttonName: string, path: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('main').getByRole('button', { name: buttonName, exact: true }).click();
  await (await chooser).setFiles(path);
  return page.getByRole('dialog', { name: 'Restore this backup?' });
}

/** Restores from the welcome screen on a device with no data. */
export async function restoreOnWelcome(page: Page, path: string): Promise<void> {
  await passInstallStep(page);
  const dialog = await pickBackup(page, 'Yes, restore a backup', path);
  await dialog.getByRole('button', { name: 'Replace all data' }).click();
  await expect(button(page, /Today's session/)).toBeVisible();
}

export async function editJson(path: string, edit: (json: Record<string, unknown>) => void, to: string): Promise<string> {
  const json = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  edit(json);
  await writeFile(to, JSON.stringify(json));
  return to;
}

/** Deletes the app database from the page; Dexie closes its connection on versionchange. */
export async function deleteDatabase(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('workout-tracker');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('deleteDatabase failed'));
      }),
  );
}

export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
