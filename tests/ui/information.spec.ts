import { expect, test } from '@playwright/test';

test('business navigation and published route links resolve', async ({
  page,
  request,
}) => {
  const links = new Set<string>();
  for (const path of [
    '/',
    '/tienda',
    '/tienda?page=2',
    '/colecciones/top-10',
    '/perfumes/brisa-bergamota',
    '/nosotros',
    '/contacto',
    '/preguntas-frecuentes',
  ]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO');
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href')!),
      ))
      links.add(href);
  }
  for (const href of links)
    expect((await request.get(href)).status(), href).toBe(200);
  await page.goto('/contacto');
  await expect(
    page.getByRole('link', { name: /Escribir al principal/ }),
  ).toHaveAttribute('href', 'https://wa.me/573108570230');
  await expect(
    page.getByRole('link', { name: /Escribir al alternativo/ }),
  ).toHaveAttribute('href', 'https://wa.me/573122777427');
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^\+57 310 8570230$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^\+57 312 2777427$/ }),
  ).toBeVisible();
});

test('policies disclose pending content and error pages provide recovery', async ({
  page,
}) => {
  for (const slug of ['envios', 'devoluciones', 'privacidad', 'terminos']) {
    expect((await page.goto(`/politicas/${slug}`))?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: 'Pendiente de aprobación y publicación',
      }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  }
  expect((await page.goto('/politicas/missing'))?.status()).toBe(404);
  expect((await page.goto('/no-existe'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'No encontramos esta página',
  );
  await page
    .getByRole('link', { name: 'Buscar un perfume', exact: true })
    .click();
  await expect(page).toHaveURL(/\/buscar$/);
  expect((await page.goto('/500'))?.status()).toBe(500);
  await expect(
    page.getByRole('link', { name: 'Volver al inicio', exact: true }),
  ).toHaveAttribute('href', '/');
});
