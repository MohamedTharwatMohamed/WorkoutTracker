import { addRoutineMachine, button, expect, onboard, startSession, test } from './support/app';

test('log sets in few taps, undo, and survive a reload during rest', async ({ page }) => {
  await onboard(page);
  await addRoutineMachine(page);
  await startSession(page);

  const edits = button(page, 'Edit');
  const rest = page.getByLabel('Rest', { exact: true });

  // Set 1 is pre-filled from the routine target: one tap saves it.
  await button(page, 'Save').click();
  await expect(edits).toHaveCount(1);
  await expect(rest).toBeVisible();

  // Set 2 with a heavier weight: two taps.
  await button(page, 'Weight +').click();
  await button(page, 'Save').click();
  await expect(edits).toHaveCount(2);

  await button(page, 'Undo').click();
  await expect(edits).toHaveCount(1);

  await button(page, 'Save').click();
  await expect(edits).toHaveCount(2);
  await expect(rest).toBeVisible();

  await page.reload();
  await expect(edits).toHaveCount(2);
  await expect(rest).toBeVisible();
  await expect(button(page, 'Save')).toBeVisible();
});
