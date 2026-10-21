import { expect, test } from '@playwright/test';
import { sampleProducts } from '../../src/lib/commerce/fixtures';
import AxeBuilder from '@axe-core/playwright';

test('long desktop carts offer complete copy/paste and accessible handoff', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const items = sampleProducts.flatMap((p) =>
    p.variants
      .filter((v) => v.availability === 'available')
      .map((v) => ({
        productId: p.id,
        variantId: v.id,
        name: p.name,
        slug: p.slug,
        label: v.label,
        sku: v.sku,
        quantity: 1,
        amountCop: v.price.amount,
      })),
  );
  await page.evaluate(
    (items) =>
      localStorage.setItem(
        'khardal:cart:v1:mock',
        JSON.stringify({ version: 1, provider: 'mock', items }),
      ),
    items,
  );
  await page.goto('/carrito');
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(
    page.getByRole('link', { name: 'Abrir WhatsApp y pegar mensaje' }),
  ).toHaveAttribute('href', 'https://wa.me/573108570230');
  await expect(page.getByLabel('Mensaje para WhatsApp')).toHaveValue(
    new RegExp(items.at(-1)!.sku),
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole('button', { name: 'Copiar mensaje' }).click();
  await expect(page.locator('[data-handoff-status]')).toContainText(
    'Mensaje copiado',
  );
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(await page.getByLabel('Mensaje para WhatsApp').inputValue());
  expect(
    (
      await new AxeBuilder({ page })
        .exclude('astro-dev-toolbar')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test('an in-flight result cannot prepare a message after the cart changes', async ({
  page,
}) => {
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/carrito');
  let release!: () => void, finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route('**/api/cart/validate', async (route) => {
    const response = await route.fetch();
    await gate;
    try {
      await route.fulfill({ response });
    } catch {
      /* The client aborts obsolete requests. */
    } finally {
      finish();
    }
  });
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-validation-status]')).toContainText(
    'Verificando',
  );
  await page
    .locator('[data-cart-panel="page"]')
    .getByRole('spinbutton')
    .fill('2');
  await page
    .locator('[data-cart-panel="page"]')
    .getByRole('spinbutton')
    .press('Tab');
  release();
  await done;
  await expect(page.locator('[data-handoff]')).toBeHidden();
  await expect(page.locator('[data-validation-status]')).toBeEmpty();
});

test('WhatsApp handoff uses server message, handles clipboard failure and retains cart', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/carrito');
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  const message = page.getByLabel('Mensaje para WhatsApp');
  await expect(message).toHaveValue(/DEMOSTRACIÓN/);
  const text = await message.inputValue();
  expect(text).toContain('Brisa de bergamota');
  expect(text).toMatch(/COP\s65\.000/);
  const link = page.getByRole('link', { name: 'Abrir WhatsApp', exact: true });
  const url = new URL((await link.getAttribute('href'))!);
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/573108570230');
  expect(url.searchParams.get('text')).toBe(text);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole('button', { name: 'Copiar mensaje' }).click();
  await expect(page.locator('[data-handoff-status]')).toContainText(
    'El mensaje está seleccionado',
  );
  await expect(message).toBeFocused();
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<p>WhatsApp test intercepted</p>',
    }),
  );
  const popup = context.waitForEvent('page');
  await link.click();
  await (await popup).close();
  await expect(page.locator('[data-handoff-status]')).toContainText(
    'Tu carrito se conserva',
  );
  await page.reload();
  await expect(
    page.locator('[data-cart-panel="page"] [data-cart-items] li'),
  ).toHaveCount(1);
});

test('editing the cart hides prepared messages and expired links require validation', async ({
  page,
}) => {
  await page.goto('/perfumes/brisa-bergamota');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/carrito');
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(page.locator('[data-handoff]')).toBeVisible();
  await page
    .locator('[data-cart-panel="page"]')
    .getByRole('spinbutton')
    .fill('2');
  await page
    .locator('[data-cart-panel="page"]')
    .getByRole('spinbutton')
    .press('Tab');
  await expect(page.locator('[data-handoff]')).toBeHidden();
  await page.clock.install();
  await page
    .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
    .click();
  await expect(
    page.getByRole('link', { name: 'Abrir WhatsApp', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(page.locator('[data-handoff-status]')).toContainText('caducó');
  await expect(
    page.getByRole('link', { name: 'Abrir WhatsApp', exact: true }),
  ).toHaveCount(0);
});
