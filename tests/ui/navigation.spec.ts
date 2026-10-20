import { expect, test } from '@playwright/test';

test('mobile menu traps focus, closes with Escape and returns focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/design');
  const trigger = page.getByRole('button', { name: 'Abrir menú', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Menú', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await expect(
    dialog.getByRole('button', { name: 'Cerrar menú' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Contacto' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Cerrar menú' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
  await trigger.click();
  await dialog.getByRole('link', { name: 'Tienda', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/#product-controls$/);
  await expect(page.locator('#products-heading')).toBeInViewport();
  await trigger.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Khardal Perfumería · Inicio' }),
  ).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal', exact: true }),
  ).toBeVisible();
});

test('drawers dismiss by backdrop and close button; disclosures support keyboard', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dev/design');
  const trigger = page.getByRole('button', { name: 'Abrir bolsa de ejemplo' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Bolsa de ejemplo' });
  await expect(dialog).toBeVisible();
  await page.mouse.click(10, 400);
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Cerrar bolsa de ejemplo' }).click();
  await expect(trigger).toBeFocused();
  const summary = page.locator('#demo-shipping summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(page.locator('#demo-shipping details')).toHaveAttribute(
    'open',
    '',
  );
  await summary.press('Space');
  await expect(page.locator('#demo-shipping details')).not.toHaveAttribute(
    'open',
  );
});

test('store layout has working skip navigation and primary WhatsApp', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(
    page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Escríbenos por WhatsApp' }),
  ).toHaveAttribute('href', 'https://wa.me/573108570230');
});
