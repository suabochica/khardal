import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';

test(
  'real Woo authentication failure blocks handoff, retains cart and recovers after credential restoration',
  { timeout: 60000 },
  async () => {
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise((r) => socket.close(r));
    const base = `http://127.0.0.1:${port}`;
    let server, browser;
    async function stop() {
      if (server?.exitCode === null) {
        const done = once(server, 'exit');
        server.kill('SIGTERM');
        await done;
      }
    }
    async function start(secret) {
      server = spawn(process.execPath, ['dist/server/entry.mjs'], {
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(port),
          COMMERCE_PROVIDER: 'woocommerce',
          WOOCOMMERCE_URL: `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`,
          WOOCOMMERCE_CONSUMER_KEY: process.env.WC_API_CONSUMER_KEY,
          WOOCOMMERCE_CONSUMER_SECRET: secret,
        },
        stdio: 'ignore',
      });
      for (let n = 0; n < 100; n++) {
        try {
          if (
            (
              await fetch(`${base}/api/health`, {
                signal: AbortSignal.timeout(1000),
              })
            ).ok
          )
            return;
        } catch {
          /* startup */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('Test storefront did not start.');
    }
    try {
      await start(process.env.WC_API_CONSUMER_SECRET);
      browser = await chromium.launch();
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      await page.goto(`${base}/perfumes/brisa-bergamota`);
      await page.getByRole('radio', { name: /30 ml/ }).check();
      await page.getByRole('button', { name: 'Agregar al carrito' }).click();
      await page.goto(`${base}/carrito`);
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.getByLabel('Mensaje para WhatsApp')).toHaveValue(
        /DEMOSTRACIÓN/,
      );
      const saved = await page.evaluate(() =>
        globalThis.localStorage.getItem('khardal:cart:v1:woocommerce'),
      );
      await stop();
      await start('invalid-local-recovery-secret');
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.locator('[data-validation-status]')).toContainText(
        'No pudimos verificar',
      );
      await expect(page.locator('[data-handoff]')).toBeHidden();
      await expect(
        page.locator('[data-cart-panel="page"] [data-cart-items] li'),
      ).toHaveCount(1);
      assert.equal(
        await page.evaluate(() =>
          globalThis.localStorage.getItem('khardal:cart:v1:woocommerce'),
        ),
        saved,
      );
      await expect(
        page.getByRole('link', { name: 'Contacto general por WhatsApp' }),
      ).toHaveAttribute('href', 'https://wa.me/573108570230');
      await stop();
      await start(process.env.WC_API_CONSUMER_SECRET);
      await page
        .getByRole('button', { name: 'Solicitar pedido por WhatsApp' })
        .click();
      await expect(page.getByLabel('Mensaje para WhatsApp')).toHaveValue(
        /DEMOSTRACIÓN/,
      );
      assert.equal(
        await page.evaluate(() =>
          globalThis.localStorage.getItem('khardal:cart:v1:woocommerce'),
        ),
        saved,
      );
    } finally {
      await browser?.close();
      await stop();
    }
  },
);
