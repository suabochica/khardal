import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWooCommerceAdapter } from '../src/lib/commerce/woocommerce/adapter.server.ts';
import {
  createWooClient,
  type WooConfig,
} from '../src/lib/commerce/woocommerce/client.server.ts';
import { meta, record } from '../src/lib/commerce/woocommerce/mapping.ts';
import { sampleProducts } from '../src/lib/commerce/fixtures.ts';

const config: WooConfig = {
  provider: 'woocommerce',
  url: `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`,
  consumerKey: process.env.WC_API_CONSUMER_KEY!,
  consumerSecret: process.env.WC_API_CONSUMER_SECRET!,
};
test('real local API maps fixtures and ordinary merchant products without fixture-only filtering', async () => {
  const client = createWooClient(config);
  const source = (await client.all('products', { status: 'publish' })).map(
    record,
  );
  const adapter = createWooCommerceAdapter(config);
  const catalog = await adapter.listProducts({ pageSize: 100 });
  for (const expected of sampleProducts) {
    const product = catalog.items.find((p) => p.slug === expected.slug)!;
    assert.ok(product);
    assert.equal(product.name, expected.name);
    assert.equal(product.sample, true);
    assert.equal(product.images.length, expected.images.length);
    assert.deepEqual(product.notes, expected.notes);
    const native = source.find((p) => p.slug === expected.slug)!;
    const variations = (
      await client.all(`products/${native.id}/variations`)
    ).map(record);
    for (const variation of variations) {
      const mapped = product.variants.find((v) => v.sku === variation.sku)!;
      assert.ok(mapped);
      assert.equal(mapped.price.amount, Number(variation.price));
      assert.equal(mapped.stockQuantity, variation.stock_quantity);
      assert.equal(
        mapped.availability,
        meta(variation, '_khardal_availability') === 'unknown'
          ? 'unknown'
          : variation.stock_status === 'instock'
            ? 'available'
            : 'sold-out',
      );
    }
  }
  const manual = source.filter(
    (p) =>
      meta(p, '_khardal_sample') !== 'yes' &&
      p.catalog_visibility === 'visible' &&
      (p.type === 'simple' || p.type === 'variable'),
  );
  assert.ok(
    manual.length > 0,
    'A manually created local product is required for this checkpoint.',
  );
  for (const native of manual) {
    const product = catalog.items.find((p) => p.id === `wc-p-${native.id}`)!;
    assert.ok(product, 'Published merchant product must be listed.');
    assert.equal(product.sample, false);
    assert.equal(
      (await createWooCommerceAdapter(config).getProduct(String(native.slug)))!
        .id,
      product.id,
    );
  }
  assert.equal(
    await createWooCommerceAdapter(config).getProduct('s23-missing-product'),
    null,
  );
  assert.ok((await adapter.listCollections()).some((c) => c.slug === 'arabes'));
  assert.equal(
    (await adapter.listProducts({ collection: 'top-10', pageSize: 100 })).total,
    10,
  );
  await assert.rejects(
    createWooCommerceAdapter({
      ...config,
      consumerSecret: 'invalid-s23-secret',
    }).listProducts(),
    (error) =>
      (error as { code: string }).code === 'unauthorized' &&
      !String(error).includes('invalid-s23-secret'),
  );
});
