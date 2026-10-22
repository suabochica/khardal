import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWooCatalogCache,
  catalogCacheKey,
  type CatalogSnapshot,
} from '../src/lib/commerce/woocommerce/cache.server.ts';
import { createWooCommerceAdapter } from '../src/lib/commerce/woocommerce/adapter.server.ts';
import type { WooConfig } from '../src/lib/commerce/woocommerce/client.server.ts';
import { handleValidation } from '../src/lib/cart/validate.server.ts';

const config: WooConfig = {
  provider: 'woocommerce',
  url: 'https://woo.example.test',
  consumerKey: 's24-private-key',
  consumerSecret: 's24-private-secret',
};
const empty: CatalogSnapshot = {
  products: [],
  collections: [],
  searchOnly: [],
};
test('catalog cache coalesces work, expires without sliding, isolates credentials and bounds entries/bytes', async () => {
  let time = 0,
    loads = 0;
  const cache = createWooCatalogCache({ now: () => time, maxEntries: 2 });
  const load = async () => {
    loads++;
    return structuredClone(empty);
  };
  const key = catalogCacheKey(config);
  assert.ok(
    !key.includes(config.consumerKey) && !key.includes(config.consumerSecret),
  );
  assert.notEqual(
    key,
    catalogCacheKey({ ...config, consumerSecret: 'different' }),
  );
  await Promise.all([cache.load(key, load), cache.load(key, load)]);
  assert.equal(loads, 1);
  time = 15000;
  await cache.load(key, load);
  time = 29999;
  await cache.load(key, load);
  assert.equal(loads, 1);
  time = 30000;
  await cache.load(key, load);
  assert.equal(loads, 2);
  await cache.load('second', load);
  await cache.load('third', load);
  assert.equal(cache.size(), 2);
  time = 60001;
  await assert.rejects(
    cache.load('third', async () => {
      throw new Error('offline');
    }),
  );
  assert.equal(cache.size(), 1, 'Expired values are not retained as fallback.');
  await assert.rejects(
    createWooCatalogCache({ maxBytes: 1 }).load('large', load),
    { code: 'unavailable' },
  );
});
test('invalidation discards an in-flight cache insertion', async () => {
  const cache = createWooCatalogCache();
  let finish!: (v: CatalogSnapshot) => void;
  const pending = cache.load(
    'catalog',
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  cache.invalidate('catalog');
  finish(empty);
  await pending;
  assert.equal(cache.size(), 0);
});

function backend() {
  const parent = {
    id: 10,
    type: 'variable',
    status: 'publish',
    catalog_visibility: 'visible',
    name: 'Ámbar de prueba',
    slug: 'ambar-prueba',
    menu_order: 0,
    categories: [],
    images: [],
    attributes: [],
    manage_stock: false,
    stock_quantity: null as number | null,
    stock_status: 'instock',
    meta_data: [{ key: '_khardal_sample', value: 'yes' }],
  };
  const variants = [11, 12].map((id, i) => ({
    id,
    status: 'publish',
    price: String(65000 + i * 45000),
    sku: `S24-${id}`,
    attributes: [{ option: `${30 + i * 20} ml` }],
    manage_stock: true,
    stock_quantity: 5,
    stock_status: 'instock',
    meta_data: [] as { key: string; value: string }[],
  }));
  const single = {
    ...parent,
    id: 20,
    type: 'simple',
    slug: 'simple-prueba',
    price: '99000',
    sku: 'S24-SIMPLE',
    meta_data: [],
  };
  const calls: string[] = [];
  let offline = false;
  const transport: typeof fetch = async (input) => {
    if (offline) throw new Error('s24-private-secret');
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    if (url.pathname.endsWith('/settings/general'))
      return Response.json([{ id: 'woocommerce_currency', value: 'COP' }]);
    if (url.pathname.endsWith('/products/categories')) return Response.json([]);
    if (url.pathname.endsWith('/variations')) return Response.json(variants);
    const ids = url.searchParams.get('include')?.split(',').map(Number);
    return Response.json(
      [parent, single].filter(
        (p) => p.status === 'publish' && (!ids || ids.includes(p.id)),
      ),
    );
  };
  return {
    parent,
    variants,
    single,
    transport,
    calls,
    setOffline: (value: boolean) => {
      offline = value;
    },
  };
}

test('fresh validation bypasses warm catalog prices/stock and invalidates browsing cache', async () => {
  const b = backend();
  const cache = createWooCatalogCache();
  const adapter = createWooCommerceAdapter(config, b.transport, cache);
  assert.equal(
    (await adapter.getProduct('ambar-prueba'))!.variants[0]!.price.amount,
    65000,
  );
  b.variants[0]!.price = '70000';
  b.variants[0]!.stock_quantity = 2;
  assert.equal(
    (await adapter.getProduct('ambar-prueba'))!.variants[0]!.price.amount,
    65000,
    'Browsing may use its bounded snapshot.',
  );
  const invalid = await adapter.validateCart([
    { variantId: 'wc-v-10-11', quantity: 3 },
  ]);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.lines[0]!.issue, 'insufficient-stock');
  assert.equal(invalid.lines[0]!.variant!.price.amount, 70000);
  assert.equal(cache.size(), 0);
  const valid = await adapter.validateCart([
    { variantId: 'wc-v-10-11', quantity: 2 },
    { variantId: 'wc-p-20', quantity: 1 },
  ]);
  assert.equal(valid.subtotal.amount, 239000);
  assert.equal(valid.sample, true);
  assert.ok(b.calls.some((c) => c.includes('include=10')));
  assert.equal(
    (await adapter.getProduct('ambar-prueba'))!.variants[0]!.price.amount,
    70000,
  );
  b.setOffline(true);
  await assert.rejects(
    adapter.validateCart([{ variantId: 'wc-v-10-11', quantity: 1 }]),
    (error) =>
      (error as { code: string }).code === 'unavailable' &&
      !String(error).includes('private-secret'),
  );
  assert.equal(cache.size(), 0);
});

test('validation reports unpriced, disabled, unknown, missing and aggregate parent stock correctly', async () => {
  const b = backend();
  const adapter = createWooCommerceAdapter(config, b.transport);
  b.variants[0]!.price = '';
  b.variants[1]!.meta_data = [
    { key: '_khardal_availability', value: 'unknown' },
  ];
  const result = await adapter.validateCart([
    { variantId: 'wc-v-10-11', quantity: 1 },
    { variantId: 'wc-v-10-12', quantity: 1 },
    { variantId: 'wc-v-99-11', quantity: 1 },
    { variantId: 'mock-001-30', quantity: 1 },
  ]);
  assert.deepEqual(
    result.lines.map((l) => l.issue),
    ['unavailable', 'unavailable', 'missing', 'missing'],
  );
  b.variants[0]!.price = '65000';
  b.variants[1]!.meta_data = [];
  b.variants[0]!.status = 'private';
  assert.equal(
    (await adapter.validateCart([{ variantId: 'wc-v-10-11', quantity: 1 }]))
      .lines[0]!.issue,
    'unavailable',
  );
  b.variants[0]!.status = 'publish';
  b.parent.manage_stock = true;
  b.parent.stock_quantity = 5;
  for (const v of b.variants) v.manage_stock = false;
  const shared = await adapter.validateCart([
    { variantId: 'wc-v-10-11', quantity: 3 },
    { variantId: 'wc-v-10-12', quantity: 3 },
  ]);
  assert.equal(shared.valid, false);
  assert.ok(
    shared.lines.every(
      (l) => l.issue === 'insufficient-stock' && l.stockGroup === 'wc-p-10',
    ),
  );
  assert.equal(shared.subtotal.amount, 0);
  b.parent.status = 'draft';
  assert.equal(
    (await adapter.validateCart([{ variantId: 'wc-v-10-11', quantity: 1 }]))
      .lines[0]!.issue,
    'missing',
  );
  await assert.rejects(
    adapter.validateCart([{ variantId: 'wc-p-20', quantity: 0 }]),
    { code: 'invalid-request' },
  );
  await assert.rejects(
    adapter.validateCart([
      { variantId: 'wc-p-20', quantity: 1 },
      { variantId: 'wc-p-20', quantity: 1 },
    ]),
    { code: 'invalid-request' },
  );
});

test('HTTP reconciliation uses fresh totals and labels WooCommerce sample handoffs', async () => {
  const b = backend();
  const adapter = createWooCommerceAdapter(config, b.transport);
  const send = (expectedAmountCop: number, quantity = 1) =>
    handleValidation(
      new Request('https://shop.test/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'woocommerce',
          lines: [{ variantId: 'wc-v-10-11', quantity, expectedAmountCop }],
          subtotal: 1,
        }),
      }),
      async () => adapter,
    );
  const stale = await (await send(1)).json();
  assert.equal(stale.changed, true);
  assert.equal(stale.handoff, undefined);
  assert.equal(stale.subtotalCop, 65000);
  const ready = await (await send(65000)).json();
  assert.equal(ready.valid, true);
  assert.equal(ready.sample, true);
  assert.match(ready.handoff.message, /DEMOSTRACIÓN/);
  assert.match(
    ready.handoff.message,
    /https:\/\/shop.test\/perfumes\/ambar-prueba/,
  );
});
