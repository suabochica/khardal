import { expect, test } from '@playwright/test';

test('homepage hierarchy, collection anchors and responsive layout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Un aroma.Tu propia historia.',
  );
  await expect(
    page.getByText('Catálogo de demostración.', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Explorar perfumes', exact: true })
    .click();
  await expect(page).toHaveURL(/#seleccion$/);
  await page
    .getByRole('link', { name: 'Encuentros frescos', exact: true })
    .click();
  await expect(page.locator('#coleccion-frescos')).toBeInViewport();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator('img').first()).toHaveAttribute(
    'fetchpriority',
    'high',
  );
  await expect(
    page.locator('a[href="https://wa.me/573108570230"]').first(),
  ).toBeAttached();
});
