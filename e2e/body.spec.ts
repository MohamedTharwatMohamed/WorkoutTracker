import { button, expect, isoDay, onboard, test } from './support/app';

test('record measurements, see a trend, guide and weekly check-in', async ({ page }) => {
  await onboard(page);
  await page.goto('/body');
  const field = (name: string) => page.getByLabel(name, { exact: true });

  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await field('Date').fill(isoDay(lastWeek));
  await field('Weight (kg)').fill('82');
  await field('Waist (cm)').fill('90');
  await button(page, 'Save measurements').click();
  await expect(page.getByText('Saved 2 values.')).toBeVisible();

  await field('Date').fill(isoDay(new Date()));
  await field('Weight (kg)').fill('81');
  await button(page, 'Save measurements').click();
  await expect(page.getByText('Saved 1 value.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weight', exact: true })).toBeVisible();
  await expect(page.getByText('-1 kg').first()).toBeVisible();

  await field('Waist (cm)').focus();
  await expect(page.getByRole('img', { name: 'How to measure: Waist' })).toBeVisible();

  await button(page, 'More measurements').click();
  await expect(field('Upper arm (left) (cm)')).toBeVisible();
  await expect(field('Upper arm (right) (cm)')).toBeVisible();

  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]!;
  await page.getByRole('radio', { name: weekday }).click();
  await expect(page.getByText(/Done\. Next check-in in \d+ days?/)).toBeVisible();
  await page.goto('/');
  await expect(page.getByText(/Done\. Next check-in in \d+ days?/)).toBeVisible();
});
