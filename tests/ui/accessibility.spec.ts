import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('browsing and information surfaces pass automated WCAG checks', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/',
      '/tienda',
      '/perfumes/brisa-bergamota',
      '/contacto',
      '/politicas/privacidad',
    ]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page })
        .exclude('astro-dev-toolbar')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations, `${path} at ${width}px`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tienda');
  await page.getByRole('button', { name: 'Buscar, filtrar y ordenar' }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .exclude('astro-dev-toolbar')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

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
