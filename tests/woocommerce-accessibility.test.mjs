import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { withStorefront } from '../scripts/woocommerce/browser-server.mjs';

test(
  'compiled WooCommerce layouts, keyboard focus and automated WCAG across four viewports',
  { timeout: 90000 },
  async () => {
    await mkdir('test-results/launch-review', { recursive: true });
    await withStorefront(async ({ base, browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${base}/perfumes/brisa-bergamota`);
      await page.getByRole('radio', { name: /30 ml/ }).check();
      await page.getByRole('button', { name: 'Agregar al carrito' }).click();
      let scans = 0;
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const [name, path] of [
          ['home', '/'],
          ['catalog', '/tienda'],
          ['detail', '/perfumes/brisa-bergamota'],
          ['cart', '/carrito'],
        ]) {
          assert.equal((await page.goto(base + path)).status(), 200);
          await page.evaluate(() => globalThis.document.fonts.ready);
          if (name === 'cart')
            await expect(
              page.locator('[data-cart-panel="page"] [data-cart-items] li'),
            ).toHaveCount(1);
          assert.equal(
            await page.evaluate(
              () =>
                globalThis.document.documentElement.scrollWidth <=
                globalThis.innerWidth,
            ),
            true,
            `${path} at ${width}`,
          );
          await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
          if (name === 'home' && width === 1440) {
            const talk = await page
              .getByRole('link', {
                name: 'Conversemos sobre perfumes',
                exact: true,
              })
              .boundingBox();
            const about = await page
              .getByRole('link', { name: 'Conoce Khardal', exact: true })
              .boundingBox();
            assert.ok(
              about.x > talk.x + talk.width || about.y > talk.y + talk.height,
              'Brand links need distinct touch spacing.',
            );
          }
          const result = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();
          assert.deepEqual(result.violations, [], `${path} at ${width}`);
          scans++;
          if ([390, 1440].includes(width) && name !== 'cart') {
            await page.locator('img').evaluateAll((images) =>
              Promise.all(
                images.map(async (image) => {
                  image.loading = 'eager';
                  await image.decode().catch(() => {});
                }),
              ),
            );
            await page.evaluate(() => globalThis.scrollTo(0, 0));
            await page.screenshot({
              path: `test-results/launch-review/${name}-${width}.png`,
              fullPage: true,
            });
          }
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/carrito`);
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('link', { name: 'Saltar al contenido' }),
      ).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();
      const opener = page.getByRole('button', {
        name: 'Abrir carrito',
        exact: true,
      });
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Carrito', exact: true });
      await expect(
        dialog.getByRole('button', { name: 'Cerrar carrito', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(
        dialog.getByRole('link', { name: 'Ver carrito completo' }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(
        dialog.getByRole('button', { name: 'Cerrar carrito', exact: true }),
      ).toBeFocused();
      assert.deepEqual(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
        [],
      );
      scans++;
      await page.keyboard.press('Escape');
      await expect(opener).toBeFocused();
      await page.goto(`${base}/tienda`);
      const filters = page.getByRole('button', {
        name: 'Buscar, filtrar y ordenar',
      });
      await filters.click();
      assert.deepEqual(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
        [],
      );
      scans++;
      await page.keyboard.press('Escape');
      await expect(filters).toBeFocused();
      console.log(
        `${scans} real-Woo automated WCAG scans passed; six screenshots saved under test-results/launch-review.`,
      );
    });
  },
);
