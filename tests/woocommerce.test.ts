import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWooClient,
  type WooConfig,
} from '../src/lib/commerce/woocommerce/client.server.ts';
import {
  mapCategories,
  mapProduct,
  plainText,
} from '../src/lib/commerce/woocommerce/mapping.ts';
import { createWooCommerceAdapter } from '../src/lib/commerce/woocommerce/adapter.server.ts';
import { selectProducts } from '../src/lib/commerce/catalog.ts';

const config: WooConfig = {
  provider: 'woocommerce',
  url: 'https://woo.example.test/store',
  consumerKey: 'private-key-marker',
  consumerSecret: 'private-secret-marker',
};
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => Response.json(data, { status, headers });
const categories = mapCategories([
  { id: 1, slug: 'khardal-demo-colecciones', name: 'Colecciones', parent: 0 },
  { id: 2, slug: 'top-10', name: 'Top 10', parent: 1 },
  { id: 3, slug: 'khardal-demo-tipos', name: 'Tipos', parent: 0 },
  { id: 4, slug: 'tipo-eau-de-parfum', name: 'Eau de parfum', parent: 3 },
  { id: 5, slug: 'arabes', name: 'Árabes', parent: 0 },
  { id: 6, slug: 'uncategorized', name: 'Uncategorized', parent: 0 },
]);
const simple = {
  id: 10,
  name: 'Té &amp; ámbar',
  slug: 'te-ambar',
  type: 'simple',
  status: 'publish',
  catalog_visibility: 'visible',
  description: '<p>Una &lt;historia&gt;.</p><script>alert(1)</script>',
  price: '42000.00',
  regular_price: '50000',
  sku: '',
  stock_status: 'instock',
  manage_stock: false,
  stock_quantity: null,
  categories: [{ id: 5, slug: 'arabes', name: 'Árabes' }],
  attributes: [],
  images: [{ id: 40, src: 'https://images.example.test/bottle.png', alt: '' }],
  meta_data: [],
};

test('Woo client keeps credentials in headers, preserves subpaths and refuses redirects', async () => {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const transport: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return json([]);
  };
  await createWooClient(config, transport).get('products', {
    slug: 'té & ámbar',
  });
  assert.equal(
    new URL(calls[0]!.url).pathname,
    '/store/wp-json/wc/v3/products',
  );
  assert.equal(new URL(calls[0]!.url).searchParams.get('slug'), 'té & ámbar');
  assert.ok(!calls[0]!.url.includes('private-'));
  assert.match(
    (calls[0]!.init!.headers as Record<string, string>).Authorization!,
    /^Basic /,
  );
  assert.equal(calls[0]!.init!.redirect, 'error');
  assert.equal(calls[0]!.init!.cache, 'no-store');
  await createWooClient(
    { ...config, url: 'http://127.0.0.1:8000' },
    transport,
  ).get('products');
  assert.match(
    (calls[1]!.init!.headers as Record<string, string>).Authorization!,
    /^OAuth /,
  );
  assert.ok(!new URL(calls[1]!.url).searchParams.has('consumer_key'));
});

test('Woo client normalizes auth/rate/backend/malformed/oversized errors without raw details', async () => {
  for (const [status, code] of [
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [429, 'rate-limited'],
    [500, 'unavailable'],
  ] as const) {
    const client = createWooClient(config, async () =>
      json({ message: 'private-secret-marker' }, status),
    );
    await assert.rejects(
      client.get('products'),
      (error) =>
        (error as { code: string }).code === code &&
        !String(error).includes('private-'),
    );
  }
  for (const response of [
    new Response('{bad', { headers: { 'Content-Type': 'application/json' } }),
    json([], 200, { 'content-length': '6000000' }),
    new Response('<html>private-key-marker</html>'),
  ])
    await assert.rejects(
      createWooClient(config, async () => response).get('products'),
      { code: 'unavailable' },
    );
  await assert.rejects(
    createWooClient(config, async () => {
      throw new Error('private-secret-marker');
    }).get('products'),
    (error) => !String(error).includes('private-'),
  );
  await assert.rejects(
    createWooClient(config, async () =>
      json([], 200, { 'x-wp-totalpages': '6' }),
    ).all('products'),
    { code: 'unavailable' },
  );
});

test('ordinary simple products use current COP price, preserve absent SKU/size and map safe text/images', () => {
  const product = mapProduct(simple, [], categories, config.url)!;
  assert.equal(product.name, 'Té & ámbar');
  assert.equal(product.description, 'Una <historia>.');
  assert.equal(product.sample, false);
  assert.deepEqual(product.collectionSlugs, ['arabes']);
  assert.equal(product.variants[0]!.id, 'wc-p-10');
  assert.equal(product.variants[0]!.price.amount, 42000);
  assert.equal(product.variants[0]!.sku, '');
  assert.equal(product.variants[0]!.sizeMl, null);
  assert.equal(product.images[0]!.alt, product.name);
  assert.equal(product.images[0]!.width, null);
  assert.equal(plainText('<p>Hola&nbsp;&#225;</p>'), 'Hola á');
  assert.deepEqual(
    categories.collections.map((c) => c.slug),
    ['top-10', 'arabes'],
  );
  assert.equal(
    mapProduct({ ...simple, status: 'draft' }, [], categories, config.url),
    null,
  );
  assert.equal(
    mapProduct(
      { ...simple, catalog_visibility: 'hidden' },
      [],
      categories,
      config.url,
    ),
    null,
  );
  assert.deepEqual(
    mapProduct(
      { ...simple, images: [{ id: 1, src: 'javascript:alert(1)' }] },
      [],
      categories,
      config.url,
    )!.images,
    [],
  );
  assert.throws(
    () => mapProduct({ ...simple, price: '12.50' }, [], categories, config.url),
    { code: 'unavailable' },
  );
});

test('variable products map distinct prices, unknown/sold-out/inherited stock and omit unpriced choices', () => {
  const parent = {
    ...simple,
    type: 'variable',
    categories: [
      { id: 4, name: 'Eau de parfum', slug: 'tipo-eau-de-parfum' },
      { id: 2, slug: 'top-10', name: 'Top 10' },
    ],
    meta_data: [
      { key: '_khardal_sample', value: 'yes' },
      {
        key: '_khardal_notes',
        value: { top: ['Bergamota'], heart: [], base: ['Cedro'] },
      },
    ],
  };
  const variant = {
    id: 11,
    status: 'publish',
    sku: 'SIZE-30',
    price: '65000',
    manage_stock: true,
    stock_quantity: 5,
    stock_status: 'instock',
    attributes: [{ option: '30 ml' }],
    meta_data: [],
  };
  const variants = [
    variant,
    {
      ...variant,
      id: 12,
      price: '110000',
      stock_quantity: 0,
      stock_status: 'outofstock',
    },
    {
      ...variant,
      id: 13,
      manage_stock: false,
      stock_quantity: null,
      meta_data: [{ key: '_khardal_availability', value: 'unknown' }],
    },
    { ...variant, id: 14, price: '' },
    { ...variant, id: 15, status: 'private' },
  ];
  const product = mapProduct(parent, variants, categories, config.url)!;
  assert.equal(product.variants.length, 3);
  assert.equal(product.category, 'Eau de parfum');
  assert.equal(product.sample, true);
  assert.deepEqual(
    product.variants.map((v) => v.availability),
    ['available', 'sold-out', 'unknown'],
  );
  assert.equal(product.variants[0]!.sizeMl, 30);
  assert.equal(product.variants[0]!.id, 'wc-v-10-11');
  assert.deepEqual(product.notes, {
    top: ['Bergamota'],
    heart: [],
    base: ['Cedro'],
  });
  const inherited = mapProduct(
    { ...parent, manage_stock: true, stock_quantity: 2 },
    [{ ...variant, manage_stock: 'parent', stock_quantity: null }],
    categories,
    config.url,
  )!;
  assert.equal(inherited.variants[0]!.stockQuantity, 2);
});

test('unpriced products remain browseable without inventing a zero price', () => {
  const product = mapProduct(
    { ...simple, price: '' },
    [],
    categories,
    config.url,
  )!;
  assert.deepEqual(product.variants, []);
  assert.equal(selectProducts([product]).total, 1);
  assert.equal(selectProducts([product], { minPrice: 0 }).total, 0);
  assert.equal(
    mapProduct({ ...simple, price: '0' }, [], categories, config.url)!
      .variants[0]!.price.amount,
    0,
  );
});

test('adapter follows API pages and shares a complete request-local snapshot; lookup misses return null', async () => {
  const products = Array.from({ length: 101 }, (_, i) => ({
    ...simple,
    id: i + 1,
    slug: `perfume-${i + 1}`,
    name: `Perfume ${i + 1}`,
    menu_order: i,
  }));
  let pages = 0;
  const transport: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/settings/general'))
      return json([{ id: 'woocommerce_currency', value: 'COP' }]);
    if (url.pathname.endsWith('/products/categories'))
      return json([], 200, { 'x-wp-totalpages': '0' });
    if (url.searchParams.has('slug'))
      return json(
        products.filter((p) => p.slug === url.searchParams.get('slug')),
      );
    pages++;
    const page = Number(url.searchParams.get('page'));
    return json(products.slice((page - 1) * 100, page * 100), 200, {
      'x-wp-totalpages': '2',
    });
  };
  const adapter = createWooCommerceAdapter(config, transport);
  await adapter.getFacets();
  assert.equal(
    (await adapter.listProducts({ page: 17, pageSize: 6 })).items.at(-1)!.name,
    'Perfume 101',
  );
  await adapter.listCollections();
  assert.equal(pages, 2);
  assert.equal(await adapter.getProduct('does-not-exist'), null);
  assert.equal((await adapter.getProduct('perfume-101'))!.name, 'Perfume 101');
  assert.equal((await adapter.validateCart([])).valid, true);
  const wrongCurrency = createWooCommerceAdapter(config, async (input) =>
    json(
      String(input).includes('/settings/')
        ? [{ id: 'woocommerce_currency', value: 'USD' }]
        : [],
    ),
  );
  await assert.rejects(wrongCurrency.getProduct('perfume'), {
    code: 'unavailable',
  });
});
