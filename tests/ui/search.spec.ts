import { expect, test } from '@playwright/test';

test('search/filter/sort URL state survives reload and back, and resets pagination', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tienda?page=2');
  const form = page.locator('form:visible');
  await form
    .getByLabel('Familia olfativa', { exact: true })
    .selectOption('Cítrica');
  await form
    .getByLabel('Ordenar por', { exact: true })
    .selectOption('price-desc');
  await form.getByRole('button', { name: 'Aplicar filtros' }).click();
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await expect(page.locator('[data-results] article')).toHaveCount(3);
  await expect(page.locator('[data-results] article').first()).toContainText(
    'Té y mandarina',
  );
  await page.reload();
  await expect(
    page.locator('form:visible').getByLabel('Familia olfativa'),
  ).toHaveValue('Cítrica');
  await page
    .locator('form:visible')
    .getByLabel('Buscar perfumes')
    .fill('no existe');
  await page
    .locator('form:visible')
    .getByRole('button', { name: 'Aplicar filtros' })
    .click();
  await expect(
    page.getByText('No encontramos perfumes con estos filtros', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-results] article')).toHaveCount(3);
  await expect(
    page.locator('form:visible').getByLabel('Ordenar por'),
  ).toHaveValue('price-desc');
  await page.goto('/tienda?categoria=Eau+de+parfum&orden=name');
  await page.getByRole('link', { name: 'Siguiente', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('categoria')).toBe(
    'Eau de parfum',
  );
  expect(new URL(page.url()).searchParams.get('orden')).toBe('name');
  await expect(page.locator('[data-results] article')).toHaveCount(2);
});

test('mobile filtering works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto('/buscar');
    await page
      .locator('form:visible')
      .getByLabel('Buscar perfumes')
      .fill('bergamota');
    await page
      .locator('form:visible')
      .getByRole('button', { name: 'Aplicar filtros' })
      .click();
    await expect(page.locator('[data-results] article')).toHaveCount(1);
    await expect(page.locator('[data-results]')).toContainText(
      'Brisa de bergamota',
    );
  } finally {
    await context.close();
  }
});

test('mobile search drawer combines filters and preserves collection scope', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/colecciones/top-10');
  await page.getByRole('button', { name: 'Buscar, filtrar y ordenar' }).click();
  const drawer = page.getByRole('dialog', { name: 'Buscar y filtrar' });
  await drawer.getByLabel('Buscar perfumes').fill('ambar');
  await drawer
    .getByLabel('Precio máximo (COP)', { exact: true })
    .fill('100000');
  await drawer.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.locator('[data-results] article')).toHaveCount(1);
  await expect(page.locator('[data-results] article')).toContainText(
    'Ámbar sereno',
  );
  expect(new URL(page.url()).pathname).toBe('/colecciones/top-10');
  await page.getByRole('button', { name: 'Buscar, filtrar y ordenar' }).click();
  await expect(
    page.getByRole('dialog').getByLabel('Buscar perfumes'),
  ).toHaveValue('ambar');
  await page.keyboard.press('Escape');
  expect((await page.goto('/buscar?min=200000&max=100000'))?.status()).toBe(
    400,
  );
});
