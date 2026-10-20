import { expect, test } from '@playwright/test';

test('native product selection remains reviewable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/perfumes/brisa-bergamota');
    await page.getByRole('radio', { name: /50 ml/ }).check();
    await page.getByRole('button', { name: 'Revisar selección' }).click();
    await expect(page.locator('[data-selected-price]')).toHaveText(
      'COP 110.000',
    );
    await expect(page.locator('[data-selection-summary]')).toContainText(
      '50 ml × 1',
    );
  } finally {
    await context.close();
  }
});

test('product variants update price/SKU/quantity bounds and emit a cart integration request', async ({
  page,
}) => {
  await page.goto('/perfumes/brisa-bergamota');
  await expect(page.locator('[data-selected-price]')).toHaveText('COP 65.000');
  await expect(page.getByRole('radio', { name: /100 ml/ })).toBeDisabled();
  await page.getByRole('radio', { name: /50 ml/ }).check();
  await expect(page.locator('[data-selected-price]')).toHaveText('COP 110.000');
  await expect(page.locator('[data-selected-sku]')).toHaveText(
    'KH-DEMO-001-050',
  );
  await page
    .getByRole('spinbutton', { name: 'Cantidad', exact: true })
    .fill('6');
  await page.getByRole('spinbutton', { name: 'Cantidad', exact: true }).blur();
  await page.getByRole('radio', { name: /30 ml/ }).check();
  await expect(
    page.getByRole('spinbutton', { name: 'Cantidad', exact: true }),
  ).toHaveValue('5');
  await page.evaluate(() =>
    document.addEventListener('cart:add-request', (event) => {
      (window as unknown as { selection: unknown }).selection = (
        event as CustomEvent
      ).detail;
    }),
  );
  await page.getByRole('button', { name: 'Revisar selección' }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { selection: unknown }).selection,
    ),
  ).toMatchObject({
    provider: 'mock',
    variantId: 'mock-001-30',
    quantity: 5,
    amountCop: 65000,
  });
  await expect(page.locator('[data-selection-summary]')).toContainText(
    'No se ha creado un pedido.',
  );
  await page.getByRole('link', { name: 'Ver imagen 2', exact: true }).click();
  await expect(page.locator('[data-gallery-main]')).toHaveAttribute(
    'src',
    /demo-detail.svg$/,
  );
  await expect(
    page.getByRole('link', { name: 'Ver imagen 2', exact: true }),
  ).toHaveAttribute('aria-current', 'true');
});

test('details omit absent content, disable sold-out products and return a real 404', async ({
  page,
}) => {
  await page.goto('/perfumes/jardin-iris');
  await expect(
    page.getByRole('region', { name: 'Notas olfativas' }),
  ).toHaveCount(0);
  await page.goto('/perfumes/rosa-lluvia');
  await expect(
    page.getByRole('button', { name: 'Revisar selección' }),
  ).toBeDisabled();
  await page.goto('/perfumes/horizonte-mineral');
  await expect(
    page.getByText('Imagen no disponible', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Revisar selección' }),
  ).toBeDisabled();
  expect((await page.goto('/perfumes/missing'))?.status()).toBe(404);
  await page.goto('/perfumes/memoria-luminosa');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
