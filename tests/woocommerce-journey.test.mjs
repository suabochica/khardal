import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';

test(
  'real WooCommerce browsing, fresh price/stock review, WhatsApp retention and cache expiry',
  { timeout: 120000 },
  async () => {
    const token = randomBytes(12).toString('hex');
    function probe(action, fields = {}) {
      const result = spawnSync(
        'docker',
        [
          'compose',
          '--env-file',
          '.env.woocommerce',
          'run',
          '--rm',
          '-T',
          '--entrypoint',
          'wp',
          'setup',
          'eval-file',
          '/opt/khardal/journey-probe.php',
          action,
        ],
        {
          input: JSON.stringify({ token, ...fields }),
          encoding: 'utf8',
          timeout: 30000,
        },
      );
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout.trim());
    }
    let server, browser;
    try {
      const product = probe('create');
      const socket = createServer();
      socket.listen(0, '127.0.0.1');
      await once(socket, 'listening');
      const port = socket.address().port;
      await new Promise((resolve) => socket.close(resolve));
      const base = `http://127.0.0.1:${port}`;
      server = spawn(process.execPath, ['dist/server/entry.mjs'], {
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(port),
          COMMERCE_PROVIDER: 'woocommerce',
          WOOCOMMERCE_URL: `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`,
          WOOCOMMERCE_CONSUMER_KEY: process.env.WC_API_CONSUMER_KEY,
          WOOCOMMERCE_CONSUMER_SECRET: process.env.WC_API_CONSUMER_SECRET,
        },
        stdio: 'ignore',
      });
      let ready = false;
      for (let n = 0; n < 100; n++) {
        try {
          if (
            (
              await fetch(`${base}/api/health`, {
                signal: AbortSignal.timeout(1000),
              })
            ).ok
          ) {
            ready = true;
            break;
          }
        } catch {
          /* startup */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready);
      browser = await chromium.launch();
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      await page.goto(
        `${base}/buscar?q=${token}&categoria=Eau+de+parfum&familia=Ambarada&min=100000&max=200000&orden=price-desc`,
      );
      await expect(page.locator('[data-results] article')).toHaveCount(1);
      await page.reload();
      await expect(page.locator('[data-results] article')).toHaveCount(1);
      await page.getByRole('link', { name: product.name, exact: true }).click();
      await page.getByRole('radio', { name: /30 ml/ }).check();
      await page
        .getByRole('spinbutton', { name: 'Cantidad', exact: true })
        .fill('2');
      await page.getByRole('button', { name: 'Agregar al carrito' }).click();
      probe('update', { id: product.v30, price: 129000, stock: 2 });
      await page.reload();
      await expect(page.locator('[data-selected-price]')).toHaveText(
        'COP 123.000',
      );
      await page.goto(`${base}/carrito`);
      await expect(
        page.locator('[data-cart-panel="page"] [data-cart-sample]'),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.locator('[data-validation-status]')).toContainText(
        'Los precios cambiaron',
      );
      await expect(page.locator('[data-handoff]')).toBeHidden();
      await page
        .getByRole('button', { name: 'Aceptar precios actualizados' })
        .click();
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.getByLabel('Mensaje para WhatsApp')).toHaveValue(
        /DEMOSTRACIÓN/,
      );
      const message = await page
        .getByLabel('Mensaje para WhatsApp')
        .inputValue();
      assert.match(message, /COP\s258\.000/);
      assert.match(message, /Cantidad: 2/);
      const link = page.getByRole('link', {
        name: 'Abrir WhatsApp',
        exact: true,
      });
      const target = new URL(await link.getAttribute('href'));
      assert.equal(target.pathname, '/573108570230');
      assert.equal(target.searchParams.get('text'), message);
      await page.context().route('https://wa.me/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<p>Intercepted local test</p>',
        }),
      );
      const popup = page.context().waitForEvent('page');
      await link.click();
      await (await popup).close();
      await page.reload();
      await expect(
        page.locator('[data-cart-panel="page"] [data-cart-items] li'),
      ).toHaveCount(1);
      probe('update', { id: product.v30, stock: 1 });
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.locator('[data-validation-lines]')).toContainText(
        'Solo hay 1 unidades',
      );
      await expect(page.locator('[data-handoff]')).toBeHidden();
      await page
        .locator('[data-cart-panel="page"]')
        .getByRole('spinbutton')
        .fill('1');
      await page
        .locator('[data-cart-panel="page"]')
        .getByRole('spinbutton')
        .press('Tab');
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(
        page.getByRole('link', { name: 'Abrir WhatsApp', exact: true }),
      ).toBeVisible();
      probe('update', { id: product.v30, stock: 0 });
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.locator('[data-validation-status]')).toContainText(
        'debes revisar',
      );
      await expect(page.locator('[data-handoff]')).toBeHidden();
      probe('update', { id: product.v30, stock: 5, price: '' });
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.locator('[data-validation-lines]')).toContainText(
        'Agotada o disponibilidad por confirmar',
      );
      await page.goto(`${base}/perfumes/${product.slug}`);
      await page.getByRole('radio', { name: /50 ml/ }).check();
      await page.getByRole('button', { name: 'Agregar al carrito' }).click();
      probe('delete', { id: product.v50 });
      await page.goto(`${base}/carrito`);
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.locator('[data-validation-lines]')).toContainText(
        'No disponible: quítala del carrito',
      );
      await expect(page.locator('[data-handoff]')).toBeHidden();
      // Observe the real 30-second server TTL without validation invalidating it.
      await page.goto(`${base}/perfumes/${product.simpleSlug}`);
      await expect(page.locator('[data-selected-price]')).toHaveText(
        'COP 99.900',
      );
      probe('update', { id: product.simple, price: 109900 });
      const changed = Date.now();
      let observed = false;
      while (Date.now() - changed < 40000) {
        const html = await (
          await fetch(`${base}/perfumes/${product.simpleSlug}`)
        ).text();
        const value = html.match(/data-selected-price[^>]*>([^<]+)/)?.[1] ?? '';
        if (Number(value.replace(/\D/g, '')) === 109900) {
          observed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert.ok(
        observed,
        'Native price edit must appear after bounded cache expiry.',
      );
      console.log(
        `Observed real catalog price refresh ${Date.now() - changed}ms after editing the probe.`,
      );
      const simpleValidation = await fetch(`${base}/api/cart/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: base },
        body: JSON.stringify({
          provider: 'woocommerce',
          lines: [
            {
              variantId: `wc-p-${product.simple}`,
              quantity: 1,
              expectedAmountCop: 109900,
            },
          ],
          subtotal: 1,
        }),
      });
      const result = await simpleValidation.json();
      assert.equal(result.valid, true);
      assert.equal(result.subtotalCop, 109900);
      assert.match(result.handoff.message, /DEMOSTRACIÓN/);
      const malformed = await fetch(`${base}/api/cart/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'woocommerce',
          lines: [
            {
              variantId: `wc-p-${product.simple}`,
              quantity: 100,
              expectedAmountCop: 1,
            },
          ],
        }),
      });
      assert.equal(malformed.status, 400);
    } finally {
      await browser?.close();
      if (server?.exitCode === null) {
        const exited = once(server, 'exit');
        server.kill('SIGTERM');
        await exited;
      }
      probe('cleanup');
    }
  },
);
