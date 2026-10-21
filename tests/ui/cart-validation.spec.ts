import { expect, test } from '@playwright/test';

test('provider failure keeps the cart and allows retry', async ({ page }) => {
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/carrito');
  await page.route('**/api/cart/validate', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error:
          'No pudimos verificar precios y disponibilidad. Intenta de nuevo.',
      },
    }),
  );
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-validation-status]')).toContainText(
    'Intenta de nuevo',
  );
  await expect(
    page.locator('[data-cart-panel="page"] [data-cart-items] li'),
  ).toHaveCount(1);
  await page.unroute('**/api/cart/validate');
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-validation-status]')).toContainText(
    'Precios y disponibilidad verificados',
  );
});
test('stale prices require review and edits invalidate validation', async ({
  page,
}) => {
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.evaluate(() => {
    const key = 'khardal:cart:v1:mock';
    const cart = JSON.parse(localStorage.getItem(key)!);
    cart.items[0].amountCop = 1;
    localStorage.setItem(key, JSON.stringify(cart));
  });
  await page.goto('/carrito');
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-validation-status]')).toContainText(
    'Los precios cambiaron',
  );
  await page
    .getByRole('button', { name: 'Aceptar precios actualizados' })
    .click();
  await expect(
    page.locator('[data-cart-panel="page"] [data-cart-subtotal]'),
  ).toHaveText('COP 65.000');
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-validation-status]')).toContainText(
    'Precios y disponibilidad verificados',
  );
  await page
    .locator('[data-cart-panel="page"]')
    .getByRole('spinbutton')
    .fill('99');
  await page
    .locator('[data-cart-panel="page"]')
    .getByRole('spinbutton')
    .press('Tab');
  await expect(page.locator('[data-validation-status]')).toBeEmpty();
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-validation-lines]')).toContainText(
    'Solo hay 5 unidades',
  );
  await expect(page.locator('[data-validation-status]')).toContainText(
    'debes revisar',
  );
});
