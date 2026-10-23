import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';

test(
  'Vercel output routes root/API paths to a runnable serverless function',
  { timeout: 60000 },
  async (t) => {
    t.after(() => {
      const restored = spawnSync('pnpm', ['build'], {
        env: { ...process.env, DEPLOY_TARGET: 'node' },
        encoding: 'utf8',
        timeout: 30000,
      });
      assert.equal(restored.status, 0, restored.stderr);
    });
    const png = await readFile('public/social-preview.png');
    const media = createServer((request, response) => {
      if (request.url !== '/wp-content/uploads/probe.png') {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
      });
      response.end(png);
    });
    media.listen(0, '127.0.0.1');
    await once(media, 'listening');
    t.after(
      () =>
        new Promise((resolve) => {
          media.close(resolve);
          media.closeAllConnections();
        }),
    );
    const mediaOrigin = `http://127.0.0.1:${media.address().port}`;
    const marker = 's35-vercel-build-private-sentinel';
    const result = spawnSync('pnpm', ['build:vercel'], {
      env: {
        ...process.env,
        DEPLOY_TARGET: 'vercel',
        VERCEL: '1',
        VERCEL_PROJECT_PRODUCTION_URL: 'khardal.vercel.app',
        VERCEL_URL: 'khardal-preview-example.vercel.app',
        COMMERCE_PROVIDER: 'mock',
        DEPLOYMENT_ENV: 'preview',
        WOO_MEDIA_ORIGIN: mediaOrigin,
        WOOCOMMERCE_CONSUMER_KEY: marker,
        WOOCOMMERCE_CONSUMER_SECRET: marker,
      },
      encoding: 'utf8',
      timeout: 45000,
    });
    assert.equal(result.status, 0, result.stderr);
    const root = resolve('.vercel/output');
    const routing = JSON.parse(
      await readFile(join(root, 'config.json'), 'utf8'),
    );
    assert.equal(routing.version, 3);
    for (const path of [
      '/',
      '/tienda',
      '/contacto',
      '/api/health',
      '/api/cart/validate',
      '/perfumes/brisa-bergamota',
      '/_image',
    ]) {
      assert.ok(
        routing.routes.some(
          (route) =>
            route.dest === '_render' && new RegExp(route.src).test(path),
        ),
        `Server route missing: ${path}`,
      );
    }
    const functionDirectory = join(root, 'functions/_render.func');
    const metadata = JSON.parse(
      await readFile(join(functionDirectory, '.vc-config.json'), 'utf8'),
    );
    assert.match(metadata.runtime, /^nodejs(?:22|24)\.x$/);
    assert.equal(metadata.maxDuration, 30);
    assert.ok((await stat(join(root, 'static/social-preview.png'))).isFile());
    async function inspect(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        assert.ok(
          !['.env', '.env.woocommerce'].includes(entry.name),
          'Local environment file must not be packaged.',
        );
        if (entry.isDirectory()) await inspect(path);
        else if (
          entry.isFile() &&
          /\.(?:[cm]?js|json|html|css)$/.test(entry.name)
        )
          assert.ok(
            !(await readFile(path, 'utf8')).includes(marker),
            'Build-time secret was embedded in Vercel output.',
          );
      }
    }
    await inspect(root);
    const previous = process.env.COMMERCE_PROVIDER;
    process.env.COMMERCE_PROVIDER = 'mock';
    try {
      const { default: handler } = await import(
        pathToFileURL(join(functionDirectory, metadata.handler)).href
      );
      assert.equal(typeof handler.fetch, 'function');
      for (const path of ['/', '/tienda', '/contacto', '/carrito']) {
        const response = await handler.fetch(
          new Request(`https://khardal.vercel.app${path}`),
        );
        assert.equal(
          response.status,
          200,
          `${path} must render through the Vercel entrypoint.`,
        );
        assert.match(await response.text(), /lang="es-CO"/);
      }
      const health = await handler.fetch(
        new Request('https://khardal.vercel.app/api/health'),
      );
      assert.equal(health.status, 200);
      assert.equal(health.headers.get('cache-control'), 'no-store');
      assert.equal((await health.json()).status, 'ok');
      const image = await handler.fetch(
        new Request(
          `https://khardal.vercel.app/_image?href=${encodeURIComponent(mediaOrigin + '/wp-content/uploads/probe.png')}&w=320&h=168&q=80&f=webp`,
        ),
      );
      assert.equal(image.status, 200);
      assert.match(image.headers.get('content-type'), /image\/webp/);
      assert.equal(
        Buffer.from(await image.arrayBuffer())
          .subarray(0, 4)
          .toString(),
        'RIFF',
      );
      for (const host of [
        'khardal.vercel.app',
        'khardal-preview-example.vercel.app',
      ]) {
        const response = await handler.fetch(
          new Request(`https://${host}/api/cart/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: `https://${host}`,
            },
            body: JSON.stringify({
              provider: 'mock',
              lines: [
                {
                  variantId: 'mock-001-30',
                  quantity: 1,
                  expectedAmountCop: 65000,
                },
              ],
            }),
          }),
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.valid, true);
        assert.match(body.handoff.message, /DEMOSTRACIÓN/);
      }
      const missing = await handler.fetch(
        new Request('https://khardal.vercel.app/no-existe'),
      );
      assert.equal(missing.status, 404);
      assert.match(await missing.text(), /No encontramos esta página/);
      const robots = await handler.fetch(
        new Request('https://khardal.vercel.app/robots.txt'),
      );
      assert.match(await robots.text(), /Disallow: \//);
    } finally {
      if (previous === undefined) delete process.env.COMMERCE_PROVIDER;
      else process.env.COMMERCE_PROVIDER = previous;
    }
  },
);
