import { addRoutineMachine, button, expect, onboard, startSession, test } from './support/app';

test('Safari tab: install steps and warning show, and logging works', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Mobile Safari', 'iPhone browser-tab journey');
  await page.goto('/');
  await expect(page.getByText('Tap the Share button in Safari.')).toBeVisible();
  await onboard(page);
  await expect(page.getByText('You are using the browser tab')).toBeVisible();

  await addRoutineMachine(page);
  await startSession(page);
  await button(page, 'Save').click();
  await expect(button(page, 'Edit')).toHaveCount(1);
});
