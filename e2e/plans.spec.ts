import { button, expect, onboard, test } from './support/app';

test('filter plans, use one as the routine, then start it', async ({ page }) => {
  await onboard(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plans', exact: true }).click();

  await page.getByRole('group', { name: 'Goal' }).getByRole('button', { name: 'Build muscle' }).click();
  await page.getByRole('group', { name: 'Focus' }).getByRole('button', { name: 'Shoulders' }).click();
  await expect(page.getByRole('heading', { name: 'Upper / Lower Strength' })).toHaveCount(0);
  await page.getByRole('heading', { name: 'Push · Pull · Legs' }).click();

  await expect(page.getByRole('heading', { name: 'Set styles in this plan' })).toBeVisible();
  await button(page, 'Use as my routine').first().click();
  await expect(page.getByText('Routine updated.')).toBeVisible();

  await page.getByRole('link', { name: 'Edit my routine' }).click();
  await expect(page.getByRole('combobox').first()).toHaveValue('pyramid');
  await page.goto('/');
  await expect(page.getByText('Push · Pull · Legs · Push')).toBeVisible();
  await expect(page.getByText('Pyramid', { exact: true }).first()).toBeVisible();

  await page.goto('/plans/push-pull-legs');
  await button(page, 'Start now').first().click();
  await expect(page).toHaveURL(/\/session$/);
  await expect(button(page, 'Start')).toBeEnabled();
});
