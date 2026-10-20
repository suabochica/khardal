import { expect, test } from '@playwright/test';

test('product controls preserve variant prices and quantity bounds', async ({
  page,
}) => {
  await page.goto('/dev/design');
  const variants = page.getByRole('group', {
    name: 'Elige una presentación',
    exact: true,
  });
  await variants.getByRole('radio', { name: /^60 ml/ }).check();
  await expect(variants.getByRole('status')).toContainText(
    /60 ml · COP\s*46\.300/,
  );
  await expect(variants.getByRole('radio', { name: /100 ml/ })).toBeDisabled();
  await expect(
    page
      .getByRole('group', { name: 'Sin disponibilidad', exact: true })
      .getByRole('status'),
  ).toHaveText('Sin presentaciones disponibles.');
  const quantity = page.getByRole('group', { name: 'Cantidad', exact: true });
  const input = quantity.getByRole('spinbutton');
  await expect(
    quantity.getByRole('button', { name: 'Reducir cantidad' }),
  ).toBeDisabled();
  await quantity.getByRole('button', { name: 'Aumentar cantidad' }).click();
  await expect(input).toHaveValue('2');
  await input.fill('999');
  await input.press('Tab');
  await expect(input).toHaveValue('5');
  await expect(
    quantity.getByRole('button', { name: 'Aumentar cantidad' }),
  ).toBeDisabled();
  await input.fill('');
  await input.press('Tab');
  await expect(input).toHaveValue('1');
  await input.fill('2.5');
  await input.press('Tab');
  await expect(input).toHaveValue('2');
  await expect(
    page
      .getByRole('navigation', { name: 'Ruta de navegación' })
      .locator('[aria-current="page"]'),
  ).toHaveText('Productos de ejemplo');
});
