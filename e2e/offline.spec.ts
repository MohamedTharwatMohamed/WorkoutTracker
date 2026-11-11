import { addRoutineMachine, button, expect, onboard, startSession, test } from './support/app';

test('works offline after the first load', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit service workers are not reliable offline; checked on a real iPhone');
  await onboard(page);
  await addRoutineMachine(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();
  await startSession(page);
  await button(page, 'Save').click();
  await expect(button(page, 'Edit')).toHaveCount(1);
});
