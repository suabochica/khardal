import { expect, test } from '@playwright/test';

test('product additions persist by variant through reload and combine quantities', async ({
  page,
}) => {
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('khardal:cart:v1:mock')!),
  );
  expect(state.items).toHaveLength(1);
  expect(state.items[0]).toMatchObject({
    variantId: 'mock-001-30',
    quantity: 2,
    amountCop: 65000,
  });
  await expect(page.locator('[data-selection-summary]')).toContainText(
    'Agregado al carrito',
  );
});
