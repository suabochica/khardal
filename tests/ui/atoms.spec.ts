import { expect, test } from '@playwright/test';

test('controls expose labels, errors, keyboard state and touch targets', async ({
  page,
}) => {
  await page.goto('/dev/design');
  const action = page.getByRole('button', { name: 'Confirmar ejemplo' });
  await action.focus();
  await expect(action).toHaveCSS('outline-style', 'solid');
  await action.press('Enter');
  await expect(page.locator('#demo-action-status')).toContainText('completada');
  const chip = page.getByRole('button', { name: 'Amaderado', exact: true });
  await chip.focus();
  await chip.press('Space');
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Procesando…' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    page.getByLabel('Nombre', { exact: true }),
  ).toHaveAccessibleDescription('Escribe tu nombre para continuar.');
  await page.getByLabel('Activar opción de ejemplo').check();
  await expect(page.getByLabel('Activar opción de ejemplo')).toBeChecked();
  await page.getByRole('radio', { name: '30 ml' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '60 ml' })).toBeChecked();
  for (const element of [action, chip, page.getByLabel('Correo electrónico')]) {
    const bounds = await element.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await expect(element).toHaveCSS('border-radius', '0px');
  }
});
