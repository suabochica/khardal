import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMockAdapter } from '../src/lib/commerce/mock.ts';
import { cop, parseCop, lineTotal } from '../src/lib/commerce/money.ts';
import { sampleProducts } from '../src/lib/commerce/fixtures.ts';
import { readQuery, pageUrl } from '../src/lib/commerce/query.ts';

test('URL query bounds, duplicate handling and pagination state', () => {
  const query = readQuery(
    new URLSearchParams(
      'q=%C3%81mbar&min=0&max=200000&orden=price-desc&page=2',
    ),
  );
  assert.equal(query.search, 'Ámbar');
  assert.equal(query.minPrice, 0);
  assert.equal(
    pageUrl(
      new URL('https://example.test/tienda?q=iris&familia=Floral&page=2'),
      1,
    ),
    '/tienda?q=iris&familia=Floral',
  );
  for (const bad of [
    'min=-1',
    'min=1.5',
    'min=200&max=100',
    'orden=unknown',
    'q=a&q=b',
    'page=NaN',
    `q=${'x'.repeat(201)}`,
  ])
    assert.throws(() => readQuery(new URLSearchParams(bad)));
});

test('COP conversion rejects fractions, invalid values and unsafe totals', () => {
  assert.deepEqual(parseCop('120000.00'), cop(120000));
  for (const value of ['12.5', '-1', '1e3', 'NaN', ''])
    assert.throws(() => parseCop(value));
  assert.throws(() => lineTotal(cop(Number.MAX_SAFE_INTEGER), 2));
  assert.throws(() => cop(0.1));
  assert.deepEqual(lineTotal(cop(65000), 3), cop(195000));
});
test('fixtures have stable unique product/variant/SKU identities and optional data', async () => {
  const adapter = createMockAdapter();
  assert.equal(sampleProducts.length, 12);
  assert.equal(
    new Set(sampleProducts.flatMap((p) => p.variants.map((v) => v.id))).size,
    36,
  );
  assert.equal(
    new Set(sampleProducts.flatMap((p) => p.variants.map((v) => v.sku))).size,
    36,
  );
  assert.ok(sampleProducts.every((p) => p.sample));
  assert.ok(sampleProducts.some((p) => !p.notes));
  assert.ok(sampleProducts.some((p) => !p.images.length));
  assert.equal(await adapter.getProduct('missing'), null);
  const product = await adapter.getProduct('brisa-bergamota');
  product!.name = 'Changed externally';
  assert.equal(
    (await adapter.getProduct('brisa-bergamota'))?.name,
    'Brisa de bergamota',
  );
});
test('pagination, curated membership, normalized search and combined filters', async () => {
  const adapter = createMockAdapter();
  const first = await adapter.listProducts({ pageSize: 5 });
  const last = await adapter.listProducts({ pageSize: 5, page: 3 });
  assert.equal(first.totalPages, 3);
  assert.equal(last.items.length, 2);
  assert.equal((await adapter.listProducts({ page: 99 })).items.length, 0);
  assert.equal(
    (await adapter.listProducts({ collection: 'top-10', pageSize: 100 })).total,
    10,
  );
  assert.equal(
    (await adapter.listProducts({ search: 'ambar' })).items[0]?.slug,
    'ambar-sereno',
  );
  const filtered = await adapter.listProducts({
    family: 'Cítrica',
    minPrice: 100000,
    maxPrice: 120000,
  });
  assert.ok(filtered.total > 0);
  assert.ok(
    filtered.items.every(
      (p) =>
        p.family === 'Cítrica' &&
        p.variants.some(
          (v) => v.price.amount >= 100000 && v.price.amount <= 120000,
        ),
    ),
  );
  assert.equal(
    (
      await adapter.listProducts({
        minPrice: 70000,
        maxPrice: 70001,
        search: 'Brisa',
      })
    ).total,
    0,
  );
  await assert.rejects(adapter.listProducts({ page: 0 }), {
    code: 'invalid-request',
  });
});
test('validation uses current prices and rejects missing, unavailable, duplicate and excessive lines', async () => {
  const adapter = createMockAdapter();
  const result = await adapter.validateCart([
    { variantId: 'mock-001-30', quantity: 2 },
  ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.subtotal, cop(130000));
  const invalid = await adapter.validateCart([
    { variantId: 'missing', quantity: 1 },
    { variantId: 'mock-001-100', quantity: 1 },
    { variantId: 'mock-001-30', quantity: 6 },
    { variantId: 'mock-012-30', quantity: 1 },
  ]);
  assert.deepEqual(
    invalid.lines.map((l) => l.issue),
    ['missing', 'unavailable', 'insufficient-stock', 'unavailable'],
  );
  assert.equal(invalid.valid, false);
  assert.equal(invalid.subtotal.amount, 0);
  await assert.rejects(
    adapter.validateCart([{ variantId: 'mock-001-30', quantity: 0 }]),
  );
  await assert.rejects(
    adapter.validateCart([
      { variantId: 'mock-001-30', quantity: 3 },
      { variantId: 'mock-001-30', quantity: 3 },
    ]),
  );
});
