import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storefrontDomains } from '../storefront-origin.mjs';
test('trusted storefront hosts are exact, loopback-aware and credential-free', () => {
  assert.deepEqual(storefrontDomains('https://preview.example.test').at(-1), {
    protocol: 'https',
    hostname: 'preview.example.test',
    port: '',
  });
  assert.equal(storefrontDomains().length, 2);
  for (const bad of [
    'https://example.test/path',
    'https://key:secret@example.test',
    'http://example.test',
    'https://example.test?secret=value',
    '*.example.test',
  ])
    assert.throws(
      () => storefrontDomains(bad),
      (error) => !error.message.includes('secret=value'),
    );
});
