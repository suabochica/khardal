import { expect, test } from '@playwright/test';

test('pagination announces pending navigation', async ({ page }) => {
  await page.goto('/tienda');
  // Hold the document in place to inspect the announcement before native navigation.
  await page.locator('[data-pagination]').evaluate((link) =>
    link.addEventListener('click', (event) => event.preventDefault(), {
      once: true,
    }),
  );
  await page.getByRole('link', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Cargando perfumes…');
  await expect(page.locator('[data-results]')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await page.goto('/tienda?page=2');
  await expect(page).toHaveURL(/page=2$/);
  await expect(page.getByRole('status')).toBeHidden();
});

test('catalog pagination, collection membership and optional/unavailable data', async ({
  page,
}) => {
  await page.goto('/tienda');
  await expect(page.locator('[data-results] article')).toHaveCount(6);
  await page.getByRole('link', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/page=2$/);
  await expect(page.getByText('Agotado', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Disponibilidad por confirmar', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Imagen no disponible', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Top 10', exact: true }).click();
  await expect(page.getByText('10 perfumes · Página 1 de 2')).toBeVisible();
  await expect(
    page.getByText(
      'Selección curada de diez perfumes de muestra; no es un ranking de ventas.',
    ),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test('listing returns useful invalid, empty and missing states', async ({
  page,
}) => {
  expect((await page.goto('/colecciones/no-existe'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Colección no encontrada',
  );
  expect((await page.goto('/tienda?page=-2'))?.status()).toBe(400);
  await page.goto('/tienda?page=99');
  await expect(
    page.getByText('No hay perfumes en esta página', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ver primera página' }).click();
  await expect(page.locator('[data-results] article')).toHaveCount(6);
});
