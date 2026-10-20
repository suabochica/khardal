import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('preview and open mobile dialog pass automated accessibility checks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/design');
  await page.evaluate(() => document.fonts.ready);
  const scan = () =>
    new AxeBuilder({ page })
      .exclude('astro-dev-toolbar')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
  expect((await scan()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  expect((await scan()).violations).toEqual([]);
});
