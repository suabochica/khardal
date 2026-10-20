import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCommerceConfig } from '../src/config/commerce.ts';

test('mock requires no credentials and ignores inactive provider settings', () => {
  assert.deepEqual(parseCommerceConfig({}), { provider: 'mock' });
  assert.deepEqual(parseCommerceConfig({ COMMERCE_PROVIDER: 'mock', WOOCOMMERCE_URL: 'invalid' }), { provider: 'mock' });
});

test('invalid providers fail without echoing their values', () => {
  for (const value of ['', 'invalid-private-value']) {
    assert.throws(() => parseCommerceConfig({ COMMERCE_PROVIDER: value }), (error: Error) => {
      assert.match(error.message, /COMMERCE_PROVIDER must be/);
      assert.ok(!error.message.includes('invalid-private-value'));
      return true;
    });
  }
});

test('WooCommerce requires each active setting and allows local Docker HTTP', () => {
  const env = {
    COMMERCE_PROVIDER: 'woocommerce', WOOCOMMERCE_URL: 'http://localhost:8080/',
    WOOCOMMERCE_CONSUMER_KEY: 'test-key', WOOCOMMERCE_CONSUMER_SECRET: 'test-secret',
  };
  for (const key of ['WOOCOMMERCE_URL', 'WOOCOMMERCE_CONSUMER_KEY', 'WOOCOMMERCE_CONSUMER_SECRET']) {
    assert.throws(() => parseCommerceConfig({ ...env, [key]: ' ' }), new RegExp(`${key} is required`));
  }
  assert.deepEqual(parseCommerceConfig(env), {
    provider: 'woocommerce', url: 'http://localhost:8080', consumerKey: 'test-key', consumerSecret: 'test-secret',
  });
  for (const url of ['not-a-url', 'http://shop.example', 'ftp://localhost', 'https://user:private@shop.example', 'https://shop.example?token=private', 'https://shop.example#private']) {
    assert.throws(() => parseCommerceConfig({ ...env, WOOCOMMERCE_URL: url }), (error: Error) => {
      assert.match(error.message, /WOOCOMMERCE_URL/);
      assert.ok(!error.message.includes('private'));
      return true;
    });
  }
  assert.equal(parseCommerceConfig({ ...env, WOOCOMMERCE_URL: 'https://shop.example/wordpress/' }).provider, 'woocommerce');
});

test('Shopify requires a shop hostname and private token', () => {
  const env = { COMMERCE_PROVIDER: 'shopify', SHOPIFY_STORE_DOMAIN: 'Example.myshopify.com', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'test-token' };
  for (const key of ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_STOREFRONT_PRIVATE_TOKEN']) {
    assert.throws(() => parseCommerceConfig({ ...env, [key]: undefined }), new RegExp(`${key} is required`));
  }
  for (const domain of ['https://example.myshopify.com', 'example.com', 'example.myshopify.com/path', '-bad.myshopify.com', 'example.myshopify.com.evil.test']) {
    assert.throws(() => parseCommerceConfig({ ...env, SHOPIFY_STORE_DOMAIN: domain }), /bare myshopify.com hostname/);
  }
  assert.deepEqual(parseCommerceConfig(env), { provider: 'shopify', domain: 'example.myshopify.com', privateToken: 'test-token' });
});
