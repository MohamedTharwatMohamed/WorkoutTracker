import { expect, onboard, test } from './support/app';

test('the top button switches the theme on any screen and the choice survives a reload', async ({ page }) => {
  await onboard(page);
  const html = page.locator('html');
  const before = (await html.getAttribute('data-theme')) === 'light' ? 'light' : 'dark';
  const other = before === 'light' ? 'dark' : 'light';

  await page.getByRole('button', { name: `Switch to ${other} mode` }).click();
  await expect(html).toHaveAttribute('data-theme', other);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Body', exact: true }).click();
  await expect(page.getByRole('button', { name: `Switch to ${before} mode` })).toBeVisible();
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', other);
});
