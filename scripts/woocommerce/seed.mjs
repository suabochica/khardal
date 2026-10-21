import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import {
  sampleProducts,
  sampleCollections,
} from '../../src/lib/commerce/fixtures.ts';
import { base, catalogGet } from './api.mjs';

const mode = process.argv[2] ?? 'seed';
assert.ok(
  ['seed', 'check', 'repeat-check'].includes(mode),
  'Use seed, check or repeat-check.',
);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const catalog = {
  schema: 1,
  source: 'khardal-development-fixtures',
  collections: sampleCollections,
  products: sampleProducts.map((p) => {
    assert.match(p.id, /^mock-product-\d{3}$/);
    assert.equal(p.sample, true);
    return { ...p, parentSku: `KH-DEMO-P-${p.id.slice(-3)}` };
  }),
  images: [],
};
const rendered = new Map();
let browser;
try {
  if (mode !== 'check') browser = await chromium.launch();
  for (const product of catalog.products)
    for (const image of product.images) {
      assert.match(image.src, /^\/images\/demo-[a-z-]+\.svg$/);
      const svg = await readFile(
        new URL(`../../public${image.src}`, import.meta.url),
      );
      let png = rendered.get(image.src);
      if (browser && !png) {
        const page = await browser.newPage({
          viewport: { width: image.width, height: image.height },
        });
        await page.route('**/*', (route) => route.abort());
        await page.setContent(
          `<style>body{margin:0}</style><img style="display:block" width="${image.width}" height="${image.height}" src="data:image/svg+xml;base64,${svg.toString('base64')}">`,
        );
        await page.locator('img').evaluate((img) => img.decode());
        png = await page.locator('img').screenshot({ type: 'png' });
        rendered.set(image.src, png);
        await page.close();
      }
      catalog.images.push({
        ...image,
        productId: product.id,
        sourceSha256: sha(svg),
        ...(png ? { png: png.toString('base64') } : {}),
      });
    }
} finally {
  await browser?.close();
}

function run(action) {
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
      '/opt/khardal/seed.php',
      action,
    ],
    {
      input: JSON.stringify(catalog),
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 180000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Fixture ${action} failed:\n${result.stderr}\n${result.stdout}`,
    );
  return JSON.parse(result.stdout.trim());
}
function signature(report) {
  return sha(JSON.stringify(report.identities));
}
if (mode !== 'check') {
  const first = run('seed');
  run('check');
  console.log(
    `Seeded: ${JSON.stringify(first.counts)}. Identity digest: ${signature(first)}`,
  );
  if (mode === 'repeat-check') {
    const second = run('seed');
    run('check');
    assert.deepEqual(
      second.identities,
      first.identities,
      'Seed identity must remain stable.',
    );
    assert.deepEqual(
      second.created,
      { products: 0, variants: 0, images: 0 },
      'Second seed creates no duplicate records.',
    );
    console.log(
      `PASS: second seed preserved all IDs and created no products, variants or images. Identity digest: ${signature(second)}`,
    );
  }
}
const report = run('check');
// Independently exercise native WooCommerce REST representations and public image delivery.
const meta = (object, key) =>
  object.meta_data.find((m) => m.key === key)?.value;
for (const expected of catalog.products) {
  const id = report.identities.products[expected.parentSku];
  const product = await catalogGet(`products/${id}`);
  assert.equal(product.type, 'variable');
  assert.equal(product.name, expected.name);
  assert.equal(product.slug, expected.slug);
  assert.equal(meta(product, '_khardal_sample'), 'yes');
  assert.equal(meta(product, '_khardal_fragrance_family'), expected.family);
  assert.deepEqual(meta(product, '_khardal_notes'), expected.notes);
  assert.equal(product.images.length, expected.images.length);
  assert.deepEqual(
    product.categories.map((c) => c.id).sort((a, b) => a - b),
    [
      ...expected.collectionSlugs.map(
        (slug) => report.identities.categories[slug],
      ),
      report.identities.categories[
        `tipo-${expected.category === 'Eau de parfum' ? 'eau-de-parfum' : 'extracto-de-perfume'}`
      ],
    ].sort((a, b) => a - b),
  );
  const variants = await catalogGet(`products/${id}/variations?per_page=100`);
  assert.equal(variants.length, expected.variants.length);
  for (const v of expected.variants) {
    const actual = variants.find((item) => item.sku === v.sku);
    assert.ok(actual);
    assert.equal(Number(actual.regular_price), v.price.amount);
    assert.equal(
      actual.stock_status,
      v.availability === 'available' ? 'instock' : 'outofstock',
    );
    assert.equal(actual.stock_quantity, v.stockQuantity);
    assert.equal(actual.manage_stock, v.stockQuantity !== null);
    assert.equal(
      meta(actual, '_khardal_availability'),
      v.availability === 'unknown' ? 'unknown' : undefined,
    );
    assert.equal(actual.attributes[0].option, v.label);
  }
  for (const [index, image] of product.images.entries()) {
    assert.equal(image.alt, expected.images[index].alt);
    const url = new URL(image.src);
    assert.equal(url.origin, base);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image\/png/);
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), expected.images[index].width);
    assert.equal(png.readUInt32BE(20), expected.images[index].height);
  }
}
const top = await catalogGet(
  `products?category=${report.identities.categories['top-10']}&per_page=100&orderby=menu_order&order=asc`,
);
assert.deepEqual(
  top.map((p) => p.sku),
  catalog.products
    .filter((p) => p.collectionSlugs.includes('top-10'))
    .map((p) => p.parentSku),
);
console.log(
  `PASS: fixture CRUD parity and native REST prices/stock/categories/notes/images; curated Top 10 order. ${JSON.stringify(report.counts)}`,
);
