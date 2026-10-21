import { expect, test } from '@playwright/test';

test('cart drawer, count and full page synchronize edits and retain focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await expect(page.locator('[data-cart-count]')).toHaveText('1');
  await page
    .getByRole('button', { name: 'Abrir carrito', exact: true })
    .click();
  const drawer = page.getByRole('dialog', { name: 'Carrito', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('[data-cart-subtotal]')).toHaveText('COP 65.000');
  await drawer.getByRole('link', { name: 'Ver carrito completo' }).click();
  await expect(page).toHaveURL(/\/carrito$/);
  const panel = page.locator('[data-cart-panel="page"]');
  await panel.getByRole('spinbutton').fill('2');
  await panel.getByRole('spinbutton').press('Tab');
  await expect(panel.locator('[data-cart-subtotal]')).toHaveText('COP 130.000');
  await expect(page.locator('[data-cart-count]')).toHaveText('2');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole('button', { name: 'Abrir carrito', exact: true })
    .click();
  await expect(drawer.locator('[data-cart-subtotal]')).toHaveText(
    'COP 130.000',
  );
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Abrir carrito', exact: true }),
  ).toBeFocused();
  await panel.getByRole('button', { name: /Quitar Brisa/ }).click();
  await expect(
    panel.getByText('Tu carrito está vacío.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-cart-count]')).toHaveText('0');
  await page.reload();
  await expect(
    panel.getByText('Tu carrito está vacío.', { exact: true }),
  ).toBeVisible();
});

test('cart edits synchronize across tabs and reject fractional quantities', async ({
  page,
  context,
}) => {
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  const second = await context.newPage();
  await second.goto('/carrito');
  const panel = second.locator('[data-cart-panel="page"]');
  await expect(panel.getByRole('spinbutton')).toHaveValue('1');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await expect(panel.getByRole('spinbutton')).toHaveValue('2');
  await panel.getByRole('spinbutton').fill('1.5');
  await panel.getByRole('spinbutton').press('Tab');
  await expect(panel.getByRole('spinbutton')).toHaveValue('2');
  await expect(panel.locator('[data-cart-feedback]')).toContainText(
    'entera entre 1 y 99',
  );
  await second.close();
});
