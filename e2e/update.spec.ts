import type { Server } from 'node:http';
import { addRoutineMachine, button, expect, finishSession, onboard, test } from './support/app';
import { startSwapServer } from './support/swapServer.mjs';

const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
let server: Server | undefined;

test.describe('app update', () => {
  // dist-a and dist-b are built by globalSetup.
  // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured fixtures argument
  test.beforeAll(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'one browser is enough');
    server = (await startSwapServer({ dirs: ['dist-a', 'dist-b'], port: PORT })) as Server;
  });

  test.afterAll(() => {
    server?.close();
  });

  test('the new version waits until the session is finished', async ({ page }) => {
    test.slow();
    await onboard(page, BASE);
    await addRoutineMachine(page, BASE);
    await page.goto(`${BASE}/`);
    await button(page, /Today's session/).click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // A worker only waits while it would replace one that controls the page.
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.request.post(`${BASE}/__swap`);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      for (let i = 0; i < 100 && !registration.waiting; i++) await new Promise((r) => setTimeout(r, 100));
      if (!registration.waiting) throw new Error('no waiting worker');
    });
    await page.waitForTimeout(500);
    await expect(page.getByText('A new version is available.')).toHaveCount(0);

    await button(page, 'Start').click();
    await button(page, 'Save').click();
    await finishSession(page);
    await page.getByRole('link', { name: 'Done' }).click();
    await expect(page.getByText('A new version is available.')).toBeVisible();
    await button(page, 'Reload').click();

    await page.waitForLoadState('load');
    await page.goto(`${BASE}/settings`);
    await expect(page.getByText('App build').locator('..')).toContainText(/App build\s*b/);
  });
});
