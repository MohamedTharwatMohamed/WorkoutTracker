import { writeFile } from 'node:fs/promises';
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

test('create, edit and delete my own plan, and import the template', async ({ page }, testInfo) => {
  await onboard(page);
  await page.goto('/plans');

  await page.getByRole('link', { name: '+ Create plan' }).click();
  await button(page, 'Save plan').click();
  await expect(page.getByRole('alert')).toContainText('Give the plan a name.');
  await expect(page.getByRole('alert')).toContainText('Add at least one machine to Day A.');
  await page.getByLabel('Plan name').fill('My Leg Day');
  await page.getByLabel('Goal').selectOption({ label: 'Get stronger' });
  await button(page, '+ Add machine').click();
  await page.getByRole('dialog', { name: 'Add a machine' }).getByRole('listitem').first().getByRole('button').click();
  await page.getByRole('combobox', { name: 'Set style' }).selectOption('pyramid');
  await button(page, 'Save plan').click();

  await expect(page.getByRole('heading', { name: 'My Leg Day' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit plan' }).click();
  await page.getByLabel('Plan name').fill('My Leg Day 2');
  await button(page, 'Save plan').click();
  await expect(page.getByRole('heading', { name: 'My Leg Day 2' })).toBeVisible();
  await button(page, 'Use as my routine').click();
  await expect(page.getByText('Routine updated.')).toBeVisible();

  await page.goto('/plans');
  await page.getByRole('group', { name: 'Goal' }).getByRole('button', { name: 'Get stronger' }).click();
  await expect(page.getByRole('heading', { name: 'My Leg Day 2' })).toBeVisible();

  const download = page.waitForEvent('download');
  await button(page, 'Download template').click();
  const template = testInfo.outputPath('template.xlsx');
  await (await download).saveAs(template);
  expect((await download).suggestedFilename()).toBe('workout-plan-template.xlsx');

  const bad = testInfo.outputPath('bad.xlsx');
  await writeFile(bad, 'not a workbook');
  let chooser = page.waitForEvent('filechooser');
  await button(page, 'Import plan').click();
  await (await chooser).setFiles(bad);
  await expect(page.getByRole('alert')).toContainText('This is not an Excel (.xlsx) file.');

  chooser = page.waitForEvent('filechooser');
  await button(page, 'Import plan').click();
  await (await chooser).setFiles(template);
  const dialog = page.getByRole('dialog', { name: 'Import plans' });
  await expect(dialog).toContainText('Example plan');
  await dialog.getByRole('button', { name: 'Add 1 plan' }).click();
  await expect(page.getByText('Added 1 plan.')).toBeVisible();

  await page.getByRole('group', { name: 'Goal' }).getByRole('button', { name: 'All' }).click();
  await page.getByRole('heading', { name: 'Example plan' }).click();
  await button(page, 'Delete plan').click();
  await page.getByRole('dialog', { name: 'Delete this plan?' }).getByRole('button', { name: 'Delete plan' }).click();
  await expect(page).toHaveURL(/\/plans$/);
  await expect(page.getByRole('heading', { name: 'Example plan' })).toHaveCount(0);
});
