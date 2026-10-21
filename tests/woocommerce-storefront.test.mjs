import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import { catalogGet } from '../scripts/woocommerce/api.mjs';

test(
  'compiled storefront displays real merchant and seeded WooCommerce products without exposing credentials',
  { timeout: 60000 },
  async () => {
    const source = await catalogGet('products?status=publish&per_page=100');
    const manual =
      source.find((p) => p.name === 'Perfume WooCommerce') ??
      source.find(
        (p) =>
          p.catalog_visibility === 'visible' &&
          !p.meta_data.some((m) => m.key === '_khardal_sample'),
      );
    assert.ok(manual, 'A published manually created product is required.');
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const base = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
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
    let browser;
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
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
          /* wait for startup */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready, 'Compiled server startup');
      browser = await chromium.launch();
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      const resources = new Set();
      page.on('request', (request) => resources.add(request.url()));
      const safe = async () => {
        const html = await page.content();
        for (const value of [
          process.env.WC_API_CONSUMER_KEY,
          process.env.WC_API_CONSUMER_SECRET,
        ])
          assert.ok(
            !html.includes(value),
            'No private credentials in rendered HTML',
          );
      };
      assert.equal((await page.goto(`${base}/tienda`)).status(), 200);
      for (let i = 0; i < Math.ceil(source.length / 6); i++) {
        if (
          await page
            .getByRole('link', { name: manual.name, exact: true })
            .count()
        )
          break;
        await page
          .getByRole('link', { name: 'Siguiente', exact: true })
          .click();
      }
      await page.getByRole('link', { name: manual.name, exact: true }).click();
      assert.equal(
        await page.getByRole('heading', { level: 1 }).textContent(),
        manual.name,
      );
      if (manual.price === '') {
        assert.match(
          await page.locator('[data-selected-price]').textContent(),
          /Precio por confirmar/,
        );
        assert.equal(
          await page
            .getByRole('button', { name: 'Agregar al carrito' })
            .isDisabled(),
          true,
        );
      }
      await safe();
      assert.equal(
        (await page.goto(`${base}/perfumes/brisa-bergamota`)).status(),
        200,
      );
      await page.getByRole('radio', { name: /50 ml/ }).check();
      assert.match(
        await page.locator('[data-selected-price]').textContent(),
        /COP\s110\.000/,
      );
      assert.match(
        await page.locator('[data-gallery-main]').getAttribute('src'),
        /\/wp-content\/uploads\//,
      );
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(
          await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth,
          ),
          true,
        );
      }
      await safe();
      assert.equal(
        (await page.goto(`${base}/perfumes/s23-missing-product`)).status(),
        404,
      );
      assert.ok(
        ![...resources].some((url) => url.includes('/wp-json/')),
        'Browser never calls the private WooCommerce API',
      );
      for (const url of resources) {
        for (const value of [
          process.env.WC_API_CONSUMER_KEY,
          process.env.WC_API_CONSUMER_SECRET,
        ])
          assert.ok(!url.includes(value));
        if (
          new URL(url).origin === base &&
          new URL(url).pathname.endsWith('.js')
        ) {
          const body = await (await fetch(url)).text();
          for (const value of [
            process.env.WC_API_CONSUMER_KEY,
            process.env.WC_API_CONSUMER_SECRET,
          ])
            assert.ok(
              !body.includes(value),
              'No private credentials in client JavaScript',
            );
        }
      }
    } finally {
      await browser?.close();
      if (server.exitCode === null) {
        const exited = once(server, 'exit');
        server.kill('SIGTERM');
        await exited;
      }
    }
  },
);
