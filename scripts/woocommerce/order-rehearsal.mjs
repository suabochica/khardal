import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { withRestoredStore } from './rehearsal.mjs';

// A raw Playwright cause can contain entered credentials; expose only redacted text.
const publicRehearsalError = (message) => new Error(message);

if (!process.argv[2])
  throw new Error('Pass a verified local backup directory.');
await mkdir('test-results/order-rehearsal', { recursive: true });
await withRestoredStore(
  process.argv[2],
  async ({ base, credentials, project, cli }) => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const reference = `S20B-${randomUUID()}`;
    const read = (php) =>
      JSON.parse(cli(`echo wp_json_encode(${php});`).trim());
    const stock = () =>
      read(
        'array_map(fn($sku)=>wc_get_product(wc_get_product_id_by_sku($sku))->get_stock_quantity(),["KH-DEMO-001-030","KH-DEMO-001-050"])',
      );
    const orderCount = () =>
      read(
        'count(wc_get_orders(["limit"=>-1,"return"=>"ids","status"=>["pending","on-hold","processing","completed","cancelled","failed","refunded"]]))',
      );
    try {
      cli(
        'if(wp_get_environment_type()!=="local" || apply_filters("pre_wp_mail",null,[])!==true)WP_CLI::error("Local mail suppression required.");',
      );
      const before = stock();
      const countBefore = orderCount();
      assert.deepEqual(
        before,
        [5, 6],
        'Use an S22 baseline backup for the fixture rehearsal.',
      );
      await page.goto(base + '/wp-login.php');
      await page.locator('#user_login').fill(credentials.WC_ADMIN_USER);
      await page.locator('#user_pass').fill(credentials.WC_ADMIN_PASSWORD);
      await page.locator('#wp-submit').click();
      await page.goto(base + '/wp-admin/admin.php?page=wc-orders&action=new');
      await page
        .getByRole('button', { name: 'Añadir artículo(s)', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Añadir producto(s)', exact: true })
        .click();
      await page
        .locator('.select2-container--open .select2-search__field')
        .fill('KH-DEMO-001-030');
      await page.getByRole('option', { name: /30 ml/ }).first().click();
      await page
        .locator('.wc-backbone-modal-content input[name="item_qty"]')
        .first()
        .fill('2');
      await page
        .locator('.wc-backbone-modal-content .select2-selection')
        .last()
        .click();
      await page
        .locator('.select2-container--open .select2-search__field')
        .fill('KH-DEMO-001-050');
      await page.getByRole('option', { name: /50 ml/ }).first().click();
      await page.locator('#btn-ok').click();
      await expect(page.locator('#order_line_items tr.item')).toHaveCount(2);
      await page
        .getByRole('button', { name: 'Añadir artículo(s)', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Añadir envío', exact: true })
        .click();
      await page.locator('tr.shipping').hover();
      await page.locator('tr.shipping .edit-order-item').click();
      await page
        .locator('tr.shipping input[name^="shipping_method_title"]')
        .fill('Envío ficticio · ensayo local');
      await page
        .locator('tr.shipping select[name^="shipping_method["]')
        .selectOption('flat_rate');
      await page
        .locator('tr.shipping input[name^="shipping_cost"]')
        .fill('15000');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.locator('#order_status').selectOption('wc-pending');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.locator('button[name="save"]').click(),
      ]);
      const id = Number(new URL(page.url()).searchParams.get('id'));
      assert.ok(Number.isSafeInteger(id) && id > 0);
      await page
        .locator('#add_order_note')
        .fill(
          `${reference} · DEMOSTRACIÓN en copia restaurada. Cotización aceptada solo para ensayo; envío ficticio COP 15.000; pago NO recibido. Origen WhatsApp.`,
        );
      await page
        .getByRole('button', { name: 'Add private note', exact: true })
        .click();
      await page.getByText(reference, { exact: false }).first().waitFor();
      function state() {
        return read(
          `(function(){ $o=wc_get_order(${id}); return ["id"=>$o->get_id(),"status"=>$o->get_status(),"currency"=>$o->get_currency(),"subtotal"=>$o->get_subtotal(),"shipping"=>$o->get_shipping_total(),"total"=>$o->get_total(),"paid"=>$o->is_paid(),"items"=>array_values(array_map(fn($i)=>["sku"=>$i->get_product()->get_sku(),"quantity"=>$i->get_quantity(),"total"=>$i->get_total()],$o->get_items())),"notes"=>array_map(fn($n)=>$n->content,wc_get_order_notes(["order_id"=>${id}]))]; })()`,
        );
      }
      const pending = state();
      assert.equal(pending.status, 'pending');
      assert.equal(pending.currency, 'COP');
      assert.equal(Number(pending.total), 255000);
      assert.equal(Number(pending.shipping), 15000);
      assert.equal(Number(pending.subtotal), 240000);
      assert.equal(pending.paid, false);
      assert.deepEqual(stock(), before);
      assert.ok(pending.notes.some((n) => n.includes(reference)));
      assert.deepEqual(
        pending.items.map((i) => [i.sku, i.quantity, Number(i.total)]),
        [
          ['KH-DEMO-001-030', 2, 130000],
          ['KH-DEMO-001-050', 1, 110000],
        ],
      );
      async function status(value) {
        await page.locator('#order_status').selectOption(value);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle' }),
          page.locator('button[name="save"]').click(),
        ]);
        return state();
      }
      const held = await status('wc-on-hold');
      const heldStock = stock();
      assert.equal(held.status, 'on-hold');
      assert.equal(held.paid, false);
      assert.deepEqual(heldStock, [3, 5]);
      // A repeated save/reopen resolves the existing recorded request to the same ID.
      await page.goto(
        `${base}/wp-admin/admin.php?page=wc-orders&action=edit&id=${id}`,
      );
      await status('wc-on-hold');
      assert.deepEqual(stock(), heldStock);
      assert.equal(orderCount(), countBefore + 1);
      const cancelled = await status('wc-cancelled');
      assert.equal(cancelled.status, 'cancelled');
      assert.equal(cancelled.paid, false);
      assert.deepEqual(stock(), before);
      assert.equal(orderCount(), countBefore + 1);
      await page.screenshot({
        path: 'test-results/order-rehearsal/cancelled-order.png',
        fullPage: true,
      });
      const report = {
        date: new Date().toISOString(),
        scope:
          'Actual WooCommerce admin UI on isolated restored copy; not a customer transaction',
        project,
        reference,
        orderId: id,
        versions: read(
          '["wp"=>get_bloginfo("version"),"woo"=>WC_VERSION,"php"=>PHP_VERSION]',
        ),
        pending: {
          ...pending,
          notes: pending.notes.filter((n) => n.includes(reference)),
        },
        held: { status: held.status, paid: held.paid, stock: heldStock },
        cancelled: {
          status: cancelled.status,
          paid: cancelled.paid,
          stock: stock(),
        },
        stockBefore: before,
        recordsCreated: orderCount() - countBefore,
        duplicateHandling:
          'Reopened existing recorded reference/ID; repeated save did not create another order or reduce stock twice',
        mail: 'suppressed',
        payment: 'none',
      };
      await writeFile(
        'test-results/order-rehearsal/report.json',
        JSON.stringify(report, null, 2),
      );
      console.log(JSON.stringify(report, null, 2));
    } catch (error) {
      let message = String(error);
      for (const value of Object.values(credentials))
        if (value?.length > 8)
          message = message.replaceAll(value, '[redacted]');
      throw publicRehearsalError(message);
    } finally {
      await browser.close();
    }
  },
);
