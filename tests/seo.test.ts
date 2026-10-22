import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageSeo, siteOrigin, productSchema, jsonLd } from '../src/lib/seo.ts';
import { sampleProducts } from '../src/lib/commerce/fixtures.ts';
test('only the configured production origin is indexable; query/private/sample states remain noindex', () => {
  const site = 'https://shop.example.test';
  assert.equal(
    pageSeo(new URL(site + '/tienda?page=2'), site, 'production').canonical,
    site + '/tienda?page=2',
  );
  assert.equal(
    pageSeo(new URL(site + '/tienda'), site, 'production').indexable,
    true,
  );
  for (const [url, env, noindex] of [
    [site + '/buscar?q=iris', 'production', false],
    [site + '/tienda?familia=Floral', 'production', false],
    [site + '/carrito', 'production', false],
    ['https://preview.example.test/tienda', 'production', false],
    [site + '/tienda', 'preview', false],
    [site + '/perfumes/demo', 'production', true],
  ] as const)
    assert.equal(pageSeo(new URL(url), site, env, noindex).indexable, false);
  assert.equal(siteOrigin('http://localhost:4321'), null);
  assert.equal(siteOrigin(undefined), null);
  assert.equal(pageSeo(new URL(site), null, 'production').indexable, false);
});
test('structured product data matches current visible offers and omits demo/unpriced/fabricated claims', () => {
  const sample = structuredClone(sampleProducts[0]!);
  const site = 'https://shop.example.test';
  assert.equal(productSchema(sample, site), null);
  const real = { ...sample, sample: false };
  const schema = productSchema(real, site)!;
  const offers = schema.offers as {
    price: string;
    priceCurrency: string;
    availability?: string;
  }[];
  assert.equal(offers[0]!.price, String(real.variants[0]!.price.amount));
  assert.equal(offers[0]!.priceCurrency, 'COP');
  assert.equal(offers[2]!.availability, 'https://schema.org/OutOfStock');
  assert.equal(schema.aggregateRating, undefined);
  assert.equal(schema.brand, undefined);
  assert.equal(productSchema({ ...real, variants: [] }, site), null);
  assert.ok(
    !jsonLd({ name: '</script><script>alert(1)</script>' }).includes('<'),
  );
});
