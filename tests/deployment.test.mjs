import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentSettings } from '../deployment.mjs';
import { storefrontDomains } from '../storefront-origin.mjs';

test('Node remains local/default and explicit Vercel builds are supported', () => {
  assert.equal(deploymentSettings({}).target, 'node');
  assert.equal(
    deploymentSettings({ DEPLOY_TARGET: 'vercel' }).target,
    'vercel',
  );
  assert.equal(
    deploymentSettings({ VERCEL: '1', DEPLOY_TARGET: 'node' }).target,
    'node',
  );
  assert.throws(() => deploymentSettings({ DEPLOY_TARGET: 'static' }));
});
test('Vercel primary and deployment origins preserve preview request authority without changing canonical site', () => {
  const result = deploymentSettings({
    VERCEL: '1',
    VERCEL_PROJECT_PRODUCTION_URL: 'khardal.vercel.app',
    VERCEL_URL: 'khardal-preview-example.vercel.app',
  });
  assert.equal(result.site, 'https://khardal.vercel.app');
  assert.deepEqual(result.requestOrigins, [
    'https://khardal.vercel.app',
    'https://khardal-preview-example.vercel.app',
  ]);
  assert.ok(
    result.requestOrigins
      .flatMap(storefrontDomains)
      .some((p) => p.hostname === 'khardal-preview-example.vercel.app'),
  );
  assert.equal(
    deploymentSettings({
      VERCEL: '1',
      STOREFRONT_ORIGIN: 'https://khardal.co',
      VERCEL_URL: 'preview.vercel.app',
    }).site,
    'https://khardal.co',
  );
  assert.throws(() =>
    deploymentSettings({
      VERCEL: '1',
      VERCEL_URL: 'user:password@example.test/path',
    }),
  );
});
