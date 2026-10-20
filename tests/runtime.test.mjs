import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { test } from 'node:test';

const marker = 's04-runtime-private-sentinel';

async function withServer(settings, check) {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));

  const child = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      COMMERCE_PROVIDER: 'mock',
      WOOCOMMERCE_URL: '',
      WOOCOMMERCE_CONSUMER_KEY: '',
      WOOCOMMERCE_CONSUMER_SECRET: '',
      SHOPIFY_STORE_DOMAIN: '',
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: '',
      ...settings,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (data) => {
    logs += data;
  });
  child.stderr.on('data', (data) => {
    logs += data;
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(`${base}/`, {
          signal: AbortSignal.timeout(1000),
        });
        assert.equal(response.status, settings.COMMERCE_PROVIDER ? 503 : 200);
        const html = await response.text();
        assert.match(html, /lang="es-CO"/);
        if (process.env.DEPLOYMENT_ENV !== 'production') {
          assert.match(html, /name="robots" content="noindex, nofollow"/);
        }
        assert.ok(!html.includes(marker));
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(ready, `Production server failed to start: ${logs}`);
    await check(base, () => logs);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
  }
}

test('production renders dynamic uncached responses with runtime-only provider credentials', async () => {
  for (const settings of [
    {},
    {
      COMMERCE_PROVIDER: 'woocommerce',
      WOOCOMMERCE_URL: 'http://localhost:8080',
      WOOCOMMERCE_CONSUMER_KEY: marker,
      WOOCOMMERCE_CONSUMER_SECRET: marker,
    },
    {
      COMMERCE_PROVIDER: 'shopify',
      SHOPIFY_STORE_DOMAIN: 'example.myshopify.com',
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: marker,
    },
  ]) {
    await withServer(settings, async (base) => {
      const first = await fetch(`${base}/api/health`);
      assert.equal(first.status, 200);
      assert.equal(first.headers.get('cache-control'), 'no-store');
      const data = await first.json();
      assert.deepEqual(Object.keys(data).sort(), ['status', 'timestamp']);
      assert.equal(data.status, 'ok');
      assert.ok(!JSON.stringify(data).includes(marker));
      await new Promise((resolve) => setTimeout(resolve, 20));
      const second = await fetch(`${base}/api/health`);
      const next = await second.json();
      assert.notEqual(data.timestamp, next.timestamp);
      const preview = await fetch(`${base}/dev/design`);
      assert.equal(preview.status, 404);
    });
  }
});

test('missing active-provider credentials fail clearly without public disclosure', async () => {
  await withServer(
    {
      COMMERCE_PROVIDER: 'shopify',
      SHOPIFY_STORE_DOMAIN: 'example.myshopify.com',
    },
    async (base, logs) => {
      const response = await fetch(`${base}/api/health`);
      assert.equal(response.status, 500);
      const body = await response.text();
      assert.ok(!body.includes('SHOPIFY_STOREFRONT_PRIVATE_TOKEN'));
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.match(logs(), /SHOPIFY_STOREFRONT_PRIVATE_TOKEN is required/);
    },
  );
});
